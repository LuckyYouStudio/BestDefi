const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing Contract Interactions\n");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Testing with account:", signer.address);
  
  // 合约地址
  const VAULT_ADDRESS = "0xb6494e339FD35abA0E5845a2dc0B47D14c68993d";
  const USDC_ADDRESS = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
  const STRATEGY_ADDRESS = "0x8CD1cF363C871B5335C9Fd7BEeade205A6c467c7";
  
  // 合约ABI
  const vaultABI = [
    "function deposit(uint256 _amount) external",
    "function withdraw(uint256 _shares) external", 
    "function balance() external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
    "function getPricePerFullShare() external view returns (uint256)",
    "function strategy() external view returns (address)",
    "function token() external view returns (address)",
    "function harvest() external"
  ];
  
  const erc20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ];
  
  const strategyABI = [
    "function balanceOf() external view returns (uint256)",
    "function want() external view returns (address)",
    "function vault() external view returns (address)"
  ];
  
  // 创建合约实例
  const vault = new hre.ethers.Contract(VAULT_ADDRESS, vaultABI, signer);
  const usdc = new hre.ethers.Contract(USDC_ADDRESS, erc20ABI, signer);
  const strategy = new hre.ethers.Contract(STRATEGY_ADDRESS, strategyABI, signer);
  
  console.log("=".repeat(60));
  console.log("📋 Contract Configuration Check");
  console.log("=".repeat(60));
  
  try {
    // 检查配置
    const vaultToken = await vault.token();
    const vaultStrategy = await vault.strategy();
    const strategyVault = await strategy.vault();
    const strategyWant = await strategy.want();
    
    console.log("✅ Vault token:", vaultToken);
    console.log("✅ Vault strategy:", vaultStrategy);
    console.log("✅ Strategy vault:", strategyVault);
    console.log("✅ Strategy want:", strategyWant);
    
    // 验证配置正确性
    console.log("\n🔍 Configuration Validation:");
    console.log("Vault-USDC match:", vaultToken.toLowerCase() === USDC_ADDRESS.toLowerCase() ? "✅" : "❌");
    console.log("Vault-Strategy match:", vaultStrategy.toLowerCase() === STRATEGY_ADDRESS.toLowerCase() ? "✅" : "❌");
    console.log("Strategy-Vault match:", strategyVault.toLowerCase() === VAULT_ADDRESS.toLowerCase() ? "✅" : "❌");
    console.log("Strategy-USDC match:", strategyWant.toLowerCase() === USDC_ADDRESS.toLowerCase() ? "✅" : "❌");
    
  } catch (error) {
    console.error("❌ Configuration check failed:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("💰 Balance Check");
  console.log("=".repeat(60));
  
  try {
    // 检查余额
    const ethBalance = await hre.ethers.provider.getBalance(signer.address);
    const usdcBalance = await usdc.balanceOf(signer.address);
    const vaultShares = await vault.balanceOf(signer.address);
    const vaultTVL = await vault.balance();
    const totalShares = await vault.totalSupply();
    const pricePerShare = await vault.getPricePerFullShare();
    const strategyBalance = await strategy.balanceOf();
    
    console.log("ETH Balance:", hre.ethers.formatEther(ethBalance), "ETH");
    console.log("USDC Balance:", hre.ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("Vault Shares:", hre.ethers.formatUnits(vaultShares, 18), "yaUSDC");
    console.log("Vault TVL:", hre.ethers.formatUnits(vaultTVL, 6), "USDC");
    console.log("Total Shares:", hre.ethers.formatUnits(totalShares, 18));
    console.log("Price Per Share:", hre.ethers.formatUnits(pricePerShare, 18));
    console.log("Strategy Balance:", hre.ethers.formatUnits(strategyBalance, 6), "USDC");
    
  } catch (error) {
    console.error("❌ Balance check failed:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🔧 Permission Check");
  console.log("=".repeat(60));
  
  try {
    // 检查权限
    const allowance = await usdc.allowance(signer.address, VAULT_ADDRESS);
    console.log("USDC Allowance for Vault:", hre.ethers.formatUnits(allowance, 6), "USDC");
    
    // 检查我们能否调用harvest
    console.log("Testing harvest permission...");
    
    // 预估gas而不是真正执行
    const gasEstimate = await vault.harvest.estimateGas().catch((error) => {
      console.log("Cannot call harvest:", error.reason || error.message);
      return null;
    });
    
    if (gasEstimate) {
      console.log("✅ Can call harvest, estimated gas:", gasEstimate.toString());
    } else {
      console.log("❌ Cannot call harvest");
    }
    
  } catch (error) {
    console.error("❌ Permission check failed:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎯 Next Steps");
  console.log("=".repeat(60));
  
  const usdcBal = await usdc.balanceOf(signer.address);
  
  if (usdcBal === 0n) {
    console.log("❌ You need USDC to test deposits!");
    console.log("📝 Steps to get USDC:");
    console.log("1. Visit: https://staging.aave.com/faucet/");
    console.log("2. Connect wallet and select Sepolia");
    console.log("3. Request USDC tokens");
    console.log("4. Your address:", signer.address);
  } else {
    console.log("✅ You have USDC! Ready for testing");
    console.log("💡 Try the frontend at: http://localhost:3000");
    console.log("🔧 Or use scripts to test programmatically");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 Frontend URLs");
  console.log("=".repeat(60));
  console.log("Frontend:", "http://localhost:3000");
  console.log("Vault on Etherscan:", `https://sepolia.etherscan.io/address/${VAULT_ADDRESS}#code`);
  console.log("Strategy on Etherscan:", `https://sepolia.etherscan.io/address/${STRATEGY_ADDRESS}#code`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });