const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("VaultV2", function () {
  async function deployVaultFixture() {
    const [owner, user1, user2, keeper, feeRecipient] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    const VaultV2 = await ethers.getContractFactory("VaultV2");
    const vault = await VaultV2.deploy(
      usdc.target,
      "DeFi Yield Vault V2",
      "dyVaultV2"
    );

    // Mint USDC to users
    await usdc.mint(user1.address, ethers.parseUnits("10000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("10000", 6));

    // Approve vault
    await usdc.connect(user1).approve(vault.target, ethers.parseUnits("10000", 6));
    await usdc.connect(user2).approve(vault.target, ethers.parseUnits("10000", 6));

    return { vault, usdc, owner, user1, user2, keeper, feeRecipient };
  }

  describe("Deployment", function () {
    it("Should set the correct token", async function () {
      const { vault, usdc } = await loadFixture(deployVaultFixture);
      expect(await vault.token()).to.equal(usdc.target);
    });

    it("Should set the correct owner", async function () {
      const { vault, owner } = await loadFixture(deployVaultFixture);
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Should initialize with correct parameters", async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      expect(await vault.performanceFee()).to.equal(1000); // 10%
      expect(await vault.managementFee()).to.equal(200); // 2%
      expect(await vault.emergencyShutdown()).to.equal(false);
    });
  });

  describe("Deposits", function () {
    it("Should deposit and mint shares correctly", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("100", 6);

      await vault.connect(user1).deposit(depositAmount);

      expect(await vault.balanceOf(user1.address)).to.equal(depositAmount);
      expect(await vault.totalSupply()).to.equal(depositAmount);
    });

    it("Should reject deposits below minimum", async function () {
      const { vault, user1 } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("0.5", 6);

      await expect(
        vault.connect(user1).deposit(depositAmount)
      ).to.be.revertedWith("Amount too small");
    });

    it("Should calculate shares correctly for multiple deposits", async function () {
      const { vault, usdc, user1, user2 } = await loadFixture(deployVaultFixture);
      
      const deposit1 = ethers.parseUnits("100", 6);
      const deposit2 = ethers.parseUnits("200", 6);

      await vault.connect(user1).deposit(deposit1);
      await vault.connect(user2).deposit(deposit2);

      expect(await vault.balanceOf(user1.address)).to.equal(deposit1);
      expect(await vault.balanceOf(user2.address)).to.equal(deposit2);
      expect(await vault.totalSupply()).to.equal(deposit1 + deposit2);
    });

    it("Should block deposits when emergency shutdown", async function () {
      const { vault, owner, user1 } = await loadFixture(deployVaultFixture);
      
      await vault.connect(owner).setEmergencyShutdown(true);
      
      await expect(
        vault.connect(user1).deposit(ethers.parseUnits("100", 6))
      ).to.be.revertedWith("Emergency shutdown");
    });
  });

  describe("Withdrawals", function () {
    it("Should withdraw correct amount", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("100", 6);

      await vault.connect(user1).deposit(depositAmount);
      
      // Mine a block to avoid same block withdrawal
      await ethers.provider.send("evm_mine");

      const shareAmount = await vault.balanceOf(user1.address);
      const balanceBefore = await usdc.balanceOf(user1.address);

      await vault.connect(user1).withdraw(shareAmount);

      const balanceAfter = await usdc.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(depositAmount);
      expect(await vault.balanceOf(user1.address)).to.equal(0);
    });

    it("Should prevent same block withdrawal", async function () {
      const { vault, user1 } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("100", 6);

      await vault.connect(user1).deposit(depositAmount);

      await expect(
        vault.connect(user1).withdraw(depositAmount)
      ).to.be.revertedWith("Same block withdrawal");
    });

    it("Should handle partial withdrawals", async function () {
      const { vault, usdc, user1 } = await loadFixture(deployVaultFixture);
      const depositAmount = ethers.parseUnits("100", 6);

      await vault.connect(user1).deposit(depositAmount);
      await ethers.provider.send("evm_mine");

      const halfShares = depositAmount / 2n;
      await vault.connect(user1).withdraw(halfShares);

      expect(await vault.balanceOf(user1.address)).to.equal(halfShares);
    });
  });

  describe("Price Per Share", function () {
    it("Should start at 1e18", async function () {
      const { vault } = await loadFixture(deployVaultFixture);
      expect(await vault.getPricePerFullShare()).to.equal(ethers.parseEther("1"));
    });

    it("Should maintain price with deposits and withdrawals", async function () {
      const { vault, user1, user2 } = await loadFixture(deployVaultFixture);
      
      await vault.connect(user1).deposit(ethers.parseUnits("100", 6));
      const priceAfterDeposit = await vault.getPricePerFullShare();
      
      await vault.connect(user2).deposit(ethers.parseUnits("200", 6));
      const priceAfterSecondDeposit = await vault.getPricePerFullShare();
      
      expect(priceAfterDeposit).to.equal(priceAfterSecondDeposit);
    });
  });

  describe("Emergency Shutdown", function () {
    it("Should allow owner to toggle emergency shutdown", async function () {
      const { vault, owner } = await loadFixture(deployVaultFixture);
      
      await vault.connect(owner).setEmergencyShutdown(true);
      expect(await vault.emergencyShutdown()).to.equal(true);
      
      await vault.connect(owner).setEmergencyShutdown(false);
      expect(await vault.emergencyShutdown()).to.equal(false);
    });

    it("Should allow withdrawals during emergency shutdown", async function () {
      const { vault, owner, user1 } = await loadFixture(deployVaultFixture);
      
      await vault.connect(user1).deposit(ethers.parseUnits("100", 6));
      await ethers.provider.send("evm_mine");
      
      await vault.connect(owner).setEmergencyShutdown(true);
      
      const shares = await vault.balanceOf(user1.address);
      await vault.connect(user1).withdraw(shares);
      
      expect(await vault.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("Fees", function () {
    it("Should only allow owner to set fees", async function () {
      const { vault, owner, user1 } = await loadFixture(deployVaultFixture);
      
      await expect(
        vault.connect(user1).setPerformanceFee(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await vault.connect(owner).setPerformanceFee(500);
      expect(await vault.performanceFee()).to.equal(500);
    });

    it("Should enforce maximum fee limits", async function () {
      const { vault, owner } = await loadFixture(deployVaultFixture);
      
      await expect(
        vault.connect(owner).setPerformanceFee(3001)
      ).to.be.revertedWith("Fee too high");
      
      await expect(
        vault.connect(owner).setManagementFee(501)
      ).to.be.revertedWith("Fee too high");
    });
  });

  describe("Deposit Limits", function () {
    it("Should enforce deposit limits", async function () {
      const { vault, owner, user1 } = await loadFixture(deployVaultFixture);
      
      await vault.connect(owner).setDepositLimits(
        ethers.parseUnits("10", 6),
        ethers.parseUnits("1000", 6)
      );
      
      await expect(
        vault.connect(user1).deposit(ethers.parseUnits("5", 6))
      ).to.be.revertedWith("Amount too small");
      
      await vault.connect(user1).deposit(ethers.parseUnits("500", 6));
      
      await expect(
        vault.connect(user1).deposit(ethers.parseUnits("501", 6))
      ).to.be.revertedWith("Max deposit reached");
    });
  });
});