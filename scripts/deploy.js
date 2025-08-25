const hre = require("hardhat");

async function main() {
  console.log("Deploying DeFi Yield Aggregator MVP...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Sepolia测试网地址
  const networkName = hre.network.name;
  let USDC_ADDRESS, AAVE_POOL_PROVIDER, AUSDC_ADDRESS, REWARDS_CONTROLLER;
  
  if (networkName === "sepolia") {
    USDC_ADDRESS = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
    AAVE_POOL_PROVIDER = "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A";
    AUSDC_ADDRESS = "0x16dA4541aD1807f4443d92D26044C1147406EB80";
    REWARDS_CONTROLLER = "0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb";
  } else {
    // Goerli地址
    USDC_ADDRESS = "0xA2025B15a1757311bfD68cb14eaeFCc237AF5b43";
    AAVE_POOL_PROVIDER = "0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D";
    AUSDC_ADDRESS = "0x1Ee669290939f8a8864497Af3BC83728715265FF";
    REWARDS_CONTROLLER = "0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb";
  }
  
  console.log("\n1. Deploying Vault...");
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(
    USDC_ADDRESS,
    "Yield Aggregator USDC",
    "yaUSDC"
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("Vault deployed to:", vaultAddress);
  
  console.log("\n2. Deploying AaveV3Strategy...");
  const AaveV3Strategy = await hre.ethers.getContractFactory("AaveV3Strategy");
  const strategy = await AaveV3Strategy.deploy(
    vaultAddress,
    USDC_ADDRESS,
    AAVE_POOL_PROVIDER,
    AUSDC_ADDRESS,
    REWARDS_CONTROLLER
  );
  await strategy.waitForDeployment();
  const strategyAddress = await strategy.getAddress();
  console.log("AaveV3Strategy deployed to:", strategyAddress);
  
  console.log("\n3. Setting strategy in vault...");
  const setStrategyTx = await vault.setStrategy(strategyAddress);
  await setStrategyTx.wait();
  console.log("Strategy set in vault");
  
  console.log("\n=== Deployment Complete ===");
  console.log("Vault Address:", vaultAddress);
  console.log("Strategy Address:", strategyAddress);
  console.log("Token (USDC):", USDC_ADDRESS);
  
  console.log("\n=== Deployment Info for Frontend ===");
  const deploymentInfo = {
    network: networkName,
    contracts: {
      vault: vaultAddress,
      strategy: strategyAddress,
      token: USDC_ADDRESS,
      aToken: AUSDC_ADDRESS
    },
    timestamp: new Date().toISOString()
  };
  
  const fs = require("fs");
  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Deployment info saved to deployment.json");
  
  console.log("\n=== Verifying Contracts ===");
  if (hre.network.name === "goerli" || hre.network.name === "sepolia") {
    console.log("Waiting for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    try {
      await hre.run("verify:verify", {
        address: vaultAddress,
        constructorArguments: [USDC_ADDRESS, "Yield Aggregator USDC", "yaUSDC"],
      });
      console.log("Vault verified");
    } catch (error) {
      console.log("Vault verification error:", error.message);
    }
    
    try {
      await hre.run("verify:verify", {
        address: strategyAddress,
        constructorArguments: [
          vaultAddress,
          USDC_ADDRESS,
          AAVE_POOL_PROVIDER,
          AUSDC_ADDRESS,
          REWARDS_CONTROLLER
        ],
      });
      console.log("Strategy verified");
    } catch (error) {
      console.log("Strategy verification error:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });