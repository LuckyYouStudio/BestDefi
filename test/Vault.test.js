const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vault", function () {
  let vault, strategy, usdc;
  let owner, user1, user2, keeper;
  const USDC_ADDRESS = "0xA2025B15a1757311bfD68cb14eaeFCc237AF5b43";
  
  beforeEach(async function () {
    [owner, user1, user2, keeper] = await ethers.getSigners();
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();
    
    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy(
      await usdc.getAddress(),
      "Test Vault",
      "tVault"
    );
    await vault.waitForDeployment();
    
    await vault.setKeeper(keeper.address);
    
    await usdc.mint(user1.address, ethers.parseUnits("10000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("10000", 6));
  });
  
  describe("Deposits", function () {
    it("Should accept deposits and mint shares", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      
      await usdc.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);
      
      const shares = await vault.balanceOf(user1.address);
      expect(shares).to.equal(depositAmount);
      
      const vaultBalance = await vault.balance();
      expect(vaultBalance).to.equal(depositAmount);
    });
    
    it("Should calculate shares correctly for second depositor", async function () {
      const deposit1 = ethers.parseUnits("1000", 6);
      const deposit2 = ethers.parseUnits("500", 6);
      
      await usdc.connect(user1).approve(await vault.getAddress(), deposit1);
      await vault.connect(user1).deposit(deposit1);
      
      await usdc.connect(user2).approve(await vault.getAddress(), deposit2);
      await vault.connect(user2).deposit(deposit2);
      
      const shares1 = await vault.balanceOf(user1.address);
      const shares2 = await vault.balanceOf(user2.address);
      
      expect(shares1).to.equal(deposit1);
      expect(shares2).to.equal(deposit2);
    });
  });
  
  describe("Withdrawals", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);
    });
    
    it("Should allow withdrawals", async function () {
      const shares = await vault.balanceOf(user1.address);
      const balanceBefore = await usdc.balanceOf(user1.address);
      
      await vault.connect(user1).withdraw(shares);
      
      const balanceAfter = await usdc.balanceOf(user1.address);
      const withdrawn = balanceAfter - balanceBefore;
      
      expect(withdrawn).to.equal(ethers.parseUnits("1000", 6));
      expect(await vault.balanceOf(user1.address)).to.equal(0);
    });
    
    it("Should handle partial withdrawals", async function () {
      const shares = await vault.balanceOf(user1.address);
      const halfShares = shares / 2n;
      
      await vault.connect(user1).withdraw(halfShares);
      
      const remainingShares = await vault.balanceOf(user1.address);
      expect(remainingShares).to.equal(halfShares);
    });
  });
  
  describe("Price per share", function () {
    it("Should start at 1:1", async function () {
      const price = await vault.getPricePerFullShare();
      expect(price).to.equal(ethers.parseUnits("1", 18));
    });
    
    it("Should increase when vault receives profit", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);
      
      const priceBefore = await vault.getPricePerFullShare();
      
      await usdc.mint(await vault.getAddress(), ethers.parseUnits("100", 6));
      
      const priceAfter = await vault.getPricePerFullShare();
      expect(priceAfter).to.be.gt(priceBefore);
    });
  });
  
  describe("Fees", function () {
    it("Should only allow owner to set fees", async function () {
      await expect(
        vault.connect(user1).setPerformanceFee(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await vault.connect(owner).setPerformanceFee(500);
      expect(await vault.performanceFee()).to.equal(500);
    });
    
    it("Should enforce fee limits", async function () {
      await expect(
        vault.connect(owner).setPerformanceFee(5000)
      ).to.be.revertedWith("Fee too high");
      
      await expect(
        vault.connect(owner).setManagementFee(1000)
      ).to.be.revertedWith("Fee too high");
    });
  });
  
  describe("Access control", function () {
    it("Should only allow keeper to harvest", async function () {
      await expect(
        vault.connect(user1).harvest()
      ).to.be.revertedWith("Not keeper");
      
      await vault.connect(keeper).harvest();
    });
    
    it("Should allow owner to change keeper", async function () {
      await vault.connect(owner).setKeeper(user1.address);
      
      await vault.connect(user1).harvest();
    });
  });
});