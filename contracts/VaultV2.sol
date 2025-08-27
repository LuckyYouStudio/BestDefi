// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IStrategy.sol";

contract VaultV2 is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    IStrategy public strategy;
    
    uint256 public constant MAX_BPS = 10000;
    uint256 public performanceFee = 1000; // 10%
    uint256 public managementFee = 200; // 2%
    uint256 public lastHarvest;
    uint256 public minDepositAmount = 1e6; // 1 USDC
    uint256 public maxTotalDeposit = 1000000e6; // 1M USDC
    
    address public keeper;
    address public feeRecipient;
    
    bool public emergencyShutdown;
    
    mapping(address => uint256) public lastDepositBlock;
    
    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 amount, uint256 shares);
    event StrategyUpdated(address indexed newStrategy);
    event Harvest(uint256 profit, uint256 performanceFee, uint256 managementFee);
    event EmergencyShutdownToggled(bool active);
    
    modifier onlyKeeper() {
        require(msg.sender == keeper || msg.sender == owner(), "Not keeper");
        _;
    }
    
    modifier notShutdown() {
        require(!emergencyShutdown, "Emergency shutdown");
        _;
    }
    
    constructor(
        IERC20 _token,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        token = _token;
        keeper = msg.sender;
        feeRecipient = msg.sender;
        lastHarvest = block.timestamp;
    }
    
    function deposit(uint256 _amount) external nonReentrant notShutdown {
        require(_amount >= minDepositAmount, "Amount too small");
        require(balance() + _amount <= maxTotalDeposit, "Max deposit reached");
        
        uint256 _pool = balance();
        token.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _after = balance();
        _amount = _after - _pool;
        
        uint256 shares = 0;
        if (totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount * totalSupply()) / _pool;
        }
        
        require(shares > 0, "Invalid shares");
        
        _mint(msg.sender, shares);
        lastDepositBlock[msg.sender] = block.number;
        earn();
        
        emit Deposit(msg.sender, _amount, shares);
    }
    
    function withdraw(uint256 _shares) external nonReentrant {
        require(_shares > 0, "Shares must be greater than 0");
        require(balanceOf(msg.sender) >= _shares, "Insufficient shares");
        require(block.number > lastDepositBlock[msg.sender], "Same block withdrawal");
        
        uint256 r = (balance() * _shares) / totalSupply();
        _burn(msg.sender, _shares);
        
        uint256 b = token.balanceOf(address(this));
        if (b < r) {
            uint256 _withdraw = r - b;
            if (address(strategy) != address(0) && !emergencyShutdown) {
                strategy.withdraw(_withdraw);
            }
            uint256 _after = token.balanceOf(address(this));
            uint256 _diff = _after - b;
            if (_diff < _withdraw) {
                r = b + _diff;
            }
        }
        
        token.safeTransfer(msg.sender, r);
        emit Withdraw(msg.sender, r, _shares);
    }
    
    function earn() public notShutdown {
        uint256 _bal = available();
        uint256 minAmount = 100e6; // 100 USDC 最小投资额
        if (_bal >= minAmount && address(strategy) != address(0)) {
            token.safeTransfer(address(strategy), _bal);
            strategy.deposit(_bal);
        }
    }
    
    function harvest() external onlyKeeper notShutdown {
        require(address(strategy) != address(0), "No strategy");
        
        uint256 _before = token.balanceOf(address(this));
        uint256 harvested = strategy.harvest();
        uint256 _after = token.balanceOf(address(this));
        
        uint256 _profit = _after - _before;
        
        if (_profit > 0) {
            uint256 _performanceFee = (_profit * performanceFee) / MAX_BPS;
            
            uint256 duration = block.timestamp - lastHarvest;
            uint256 _managementFee = 0;
            
            if (duration > 0 && balance() > 0) {
                _managementFee = (balance() * managementFee * duration) / (MAX_BPS * 365 days);
            }
            
            uint256 totalFee = _performanceFee + _managementFee;
            if (totalFee > 0 && totalFee <= _profit) {
                token.safeTransfer(feeRecipient, totalFee);
            }
            
            earn();
            lastHarvest = block.timestamp;
            
            emit Harvest(_profit, _performanceFee, _managementFee);
        }
    }
    
    function balance() public view returns (uint256) {
        return token.balanceOf(address(this)) + balanceInStrategy();
    }
    
    function balanceInStrategy() public view returns (uint256) {
        if (address(strategy) == address(0)) {
            return 0;
        }
        return strategy.balanceOf();
    }
    
    function available() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
    
    function getPricePerFullShare() public view returns (uint256) {
        if (totalSupply() == 0) {
            return 1e18;
        }
        return (balance() * 1e18) / totalSupply();
    }
    
    function setStrategy(IStrategy _strategy) external onlyOwner {
        require(address(_strategy) != address(0), "Invalid strategy");
        require(_strategy.vault() == address(this), "Strategy vault mismatch");
        require(_strategy.want() == address(token), "Strategy token mismatch");
        
        if (address(strategy) != address(0)) {
            strategy.withdraw(strategy.balanceOf());
        }
        
        strategy = _strategy;
        if (!emergencyShutdown) {
            earn();
        }
        
        emit StrategyUpdated(address(_strategy));
    }
    
    function setEmergencyShutdown(bool _active) external onlyOwner {
        if (_active && !emergencyShutdown) {
            if (address(strategy) != address(0)) {
                strategy.withdraw(strategy.balanceOf());
            }
        }
        emergencyShutdown = _active;
        emit EmergencyShutdownToggled(_active);
    }
    
    function setKeeper(address _keeper) external onlyOwner {
        require(_keeper != address(0), "Invalid keeper");
        keeper = _keeper;
    }
    
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }
    
    function setPerformanceFee(uint256 _fee) external onlyOwner {
        require(_fee <= 3000, "Fee too high");
        performanceFee = _fee;
    }
    
    function setManagementFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Fee too high");
        managementFee = _fee;
    }
    
    function setDepositLimits(uint256 _min, uint256 _max) external onlyOwner {
        require(_min > 0 && _min < _max, "Invalid limits");
        minDepositAmount = _min;
        maxTotalDeposit = _max;
    }
}