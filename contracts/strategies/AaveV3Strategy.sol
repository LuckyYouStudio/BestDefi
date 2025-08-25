// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "../interfaces/IStrategy.sol";

contract AaveV3Strategy is IStrategy, Ownable {
    using SafeERC20 for IERC20;
    
    address public immutable vault;
    address public immutable want;
    
    IPool public immutable aavePool;
    IERC20 public immutable aToken;
    
    uint256 private constant MAX_UINT = 2**256 - 1;
    
    event Harvested(uint256 profit);
    event EmergencyWithdraw(uint256 amount);
    
    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }
    
    constructor(
        address _vault,
        address _want,
        address _poolAddressesProvider,
        address _aToken,
        address _rewardsController
    ) {
        vault = _vault;
        want = _want;
        
        IPoolAddressesProvider provider = IPoolAddressesProvider(_poolAddressesProvider);
        aavePool = IPool(provider.getPool());
        aToken = IERC20(_aToken);
        
        IERC20(_want).safeApprove(address(aavePool), MAX_UINT);
    }
    
    function deposit(uint256 _amount) external override onlyVault {
        if (_amount > 0) {
            IERC20(want).safeTransferFrom(vault, address(this), _amount);
            aavePool.supply(want, _amount, address(this), 0);
        }
    }
    
    function withdraw(uint256 _amount) external override onlyVault returns (uint256) {
        uint256 _balance = IERC20(want).balanceOf(address(this));
        
        if (_balance < _amount) {
            uint256 _toWithdraw = _amount - _balance;
            uint256 _aTokenBal = aToken.balanceOf(address(this));
            
            if (_toWithdraw > _aTokenBal) {
                _toWithdraw = _aTokenBal;
            }
            
            if (_toWithdraw > 0) {
                aavePool.withdraw(want, _toWithdraw, address(this));
            }
        }
        
        uint256 _withdrawn = IERC20(want).balanceOf(address(this));
        if (_withdrawn > _amount) {
            _withdrawn = _amount;
        }
        
        if (_withdrawn > 0) {
            IERC20(want).safeTransfer(vault, _withdrawn);
        }
        
        return _withdrawn;
    }
    
    function harvest() external override onlyVault returns (uint256) {
        uint256 _before = IERC20(want).balanceOf(address(this));
        
        // 简化版本：暂时不处理奖励代币
        // 实际收益来自aToken自动增长
        
        uint256 _after = IERC20(want).balanceOf(address(this));
        uint256 _profit = _after - _before;
        
        if (_profit > 0) {
            IERC20(want).safeTransfer(vault, _profit);
            
            uint256 _remainingBalance = IERC20(want).balanceOf(address(this));
            if (_remainingBalance > 0) {
                aavePool.supply(want, _remainingBalance, address(this), 0);
            }
            
            emit Harvested(_profit);
        }
        
        return _profit;
    }
    
    function balanceOf() external view override returns (uint256) {
        return balanceOfWant() + balanceOfPool();
    }
    
    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }
    
    function balanceOfPool() public view returns (uint256) {
        return aToken.balanceOf(address(this));
    }
    
    function _swapRewardToWant(address _reward, uint256 _amount) internal {
        
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 _aTokenBal = aToken.balanceOf(address(this));
        if (_aTokenBal > 0) {
            aavePool.withdraw(want, _aTokenBal, address(this));
        }
        
        uint256 _wantBal = IERC20(want).balanceOf(address(this));
        if (_wantBal > 0) {
            IERC20(want).safeTransfer(vault, _wantBal);
        }
        
        emit EmergencyWithdraw(_wantBal);
    }
    
    function setApprovals() external onlyOwner {
        IERC20(want).safeApprove(address(aavePool), 0);
        IERC20(want).safeApprove(address(aavePool), MAX_UINT);
    }
}