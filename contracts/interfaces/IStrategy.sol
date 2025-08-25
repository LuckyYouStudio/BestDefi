// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IStrategy {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external returns (uint256);
    function harvest() external returns (uint256);
    function balanceOf() external view returns (uint256);
    function want() external view returns (address);
    function vault() external view returns (address);
}