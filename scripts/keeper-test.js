const hre = require("hardhat");

class MockKeeper {
  constructor() {
    this.vaultAddress = "0xb6494e339FD35abA0E5845a2dc0B47D14c68993d";
    this.interval = 15000; // 15秒检查一次
    this.isRunning = false;
  }

  async initialize() {
    const [signer] = await hre.ethers.getSigners();
    this.signer = signer;
    
    // Vault ABI (简化版)
    const vaultABI = [
      "function harvest() external",
      "function balance() external view returns (uint256)",
      "function lastHarvest() external view returns (uint256)",
      "function keeper() external view returns (address)",
      "function totalSupply() external view returns (uint256)",
      "function getPricePerFullShare() external view returns (uint256)"
    ];
    
    this.vault = new hre.ethers.Contract(this.vaultAddress, vaultABI, signer);
    
    console.log("🤖 Mock Keeper initialized");
    console.log("Keeper Address:", signer.address);
    console.log("Vault Address:", this.vaultAddress);
    
    // 检查keeper权限
    try {
      const authorizedKeeper = await this.vault.keeper();
      console.log("Authorized Keeper:", authorizedKeeper);
      console.log("Is Authorized:", authorizedKeeper.toLowerCase() === signer.address.toLowerCase());
    } catch (error) {
      console.log("Warning: Could not check keeper authorization");
    }
  }

  async checkVaultStats() {
    try {
      const balance = await this.vault.balance();
      const totalSupply = await this.vault.totalSupply();
      const pricePerShare = await this.vault.getPricePerFullShare();
      const lastHarvest = await this.vault.lastHarvest();
      
      console.log("\n📊 Vault Statistics:");
      console.log("TVL:", hre.ethers.formatUnits(balance, 6), "USDC");
      console.log("Total Shares:", hre.ethers.formatUnits(totalSupply, 18));
      console.log("Price per Share:", hre.ethers.formatUnits(pricePerShare, 18));
      console.log("Last Harvest:", new Date(Number(lastHarvest) * 1000).toLocaleString());
      console.log("Time since last harvest:", Math.floor((Date.now() / 1000) - Number(lastHarvest)), "seconds");
      
      return {
        balance: Number(balance),
        totalSupply: Number(totalSupply),
        pricePerShare: Number(pricePerShare),
        lastHarvest: Number(lastHarvest),
        timeSinceHarvest: Math.floor((Date.now() / 1000) - Number(lastHarvest))
      };
      
    } catch (error) {
      console.error("❌ Error checking vault stats:", error.message);
      return null;
    }
  }

  async checkHarvestConditions(stats) {
    if (!stats) return false;
    
    const minInterval = 3600; // 1小时
    const minBalance = 1000000000; // 1000 USDC (6 decimals)
    
    console.log("\n🔍 Harvest Conditions Check:");
    console.log("Min interval required:", minInterval, "seconds");
    console.log("Time since last harvest:", stats.timeSinceHarvest, "seconds");
    console.log("Min balance required:", hre.ethers.formatUnits(minBalance, 6), "USDC");
    console.log("Current balance:", hre.ethers.formatUnits(stats.balance, 6), "USDC");
    
    const timeCondition = stats.timeSinceHarvest >= minInterval;
    const balanceCondition = stats.balance >= minBalance;
    
    console.log("⏰ Time condition:", timeCondition ? "✅" : "❌");
    console.log("💰 Balance condition:", balanceCondition ? "✅" : "❌");
    
    return timeCondition && balanceCondition;
  }

  async executeHarvest() {
    try {
      console.log("\n🚜 Executing harvest...");
      
      // 检查Gas价格
      const gasPrice = await hre.ethers.provider.getFeeData();
      console.log("Gas Price:", hre.ethers.formatUnits(gasPrice.gasPrice || 0, 9), "Gwei");
      
      const tx = await this.vault.harvest({
        gasLimit: 500000
      });
      
      console.log("Transaction sent:", tx.hash);
      console.log("Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log("✅ Harvest successful!");
      console.log("Gas used:", receipt.gasUsed.toString());
      console.log("Transaction fee:", hre.ethers.formatEther(receipt.gasUsed * (gasPrice.gasPrice || 0)), "ETH");
      
      return true;
      
    } catch (error) {
      console.error("❌ Harvest failed:", error.message);
      return false;
    }
  }

  async runOnce() {
    console.log("\n" + "=".repeat(50));
    console.log("🤖 Keeper Check at", new Date().toLocaleString());
    
    const stats = await this.checkVaultStats();
    
    if (await this.checkHarvestConditions(stats)) {
      console.log("\n✅ Conditions met! Executing harvest...");
      await this.executeHarvest();
    } else {
      console.log("\n⏳ Conditions not met, skipping harvest");
    }
  }

  start() {
    if (this.isRunning) {
      console.log("Keeper is already running");
      return;
    }

    console.log("\n🚀 Starting Keeper service...");
    console.log("Check interval:", this.interval / 1000, "seconds");
    
    this.isRunning = true;
    
    // 立即执行一次
    this.runOnce();
    
    // 设置定时检查
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.runOnce();
      }
    }, this.interval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.isRunning = false;
    console.log("\n🛑 Keeper service stopped");
  }
}

async function main() {
  const keeper = new MockKeeper();
  await keeper.initialize();
  
  // 运行测试
  console.log("\n🧪 Running single test...");
  await keeper.runOnce();
  
  console.log("\n" + "=".repeat(50));
  console.log("💡 To start continuous monitoring, uncomment the following line:");
  console.log("// keeper.start();");
  
  // 如果你想要持续监控，取消注释下面这行
  // keeper.start();
  
  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n👋 Received SIGINT, shutting down gracefully...');
    keeper.stop();
    process.exit(0);
  });
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ Keeper test completed");
      // process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Keeper test failed:", error);
      process.exit(1);
    });
}

module.exports = MockKeeper;