const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Getting USDC for account:", signer.address);
  
  // Sepolia USDC Faucet地址 (这些是常用的faucet地址)
  const faucetAddresses = [
    "0x88138CA1e9E485A1E688b030F85Bb79d63f156BA", // Aave Faucet
    "0x68F2c09061901b2Ae5fD7C01AAA8c0F6B73c3c39", // Alternative Faucet
  ];
  
  const usdcAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
  
  // 尝试不同的faucet方法
  const faucetMethods = [
    // 方法1: mint(token, amount)
    {
      abi: ["function mint(address token, uint256 amount) external"],
      method: "mint",
      args: [usdcAddress, hre.ethers.parseUnits("1000", 6)]
    },
    // 方法2: mint(token, to, amount) 
    {
      abi: ["function mint(address token, address to, uint256 amount) external"],
      method: "mint", 
      args: [usdcAddress, signer.address, hre.ethers.parseUnits("1000", 6)]
    },
    // 方法3: mintFor(token, to)
    {
      abi: ["function mintFor(address token, address to) external"],
      method: "mintFor",
      args: [usdcAddress, signer.address]
    }
  ];
  
  for (const faucetAddr of faucetAddresses) {
    console.log(`\nTrying faucet: ${faucetAddr}`);
    
    for (const methodConfig of faucetMethods) {
      try {
        console.log(`  Trying method: ${methodConfig.method}`);
        
        const faucet = new hre.ethers.Contract(faucetAddr, methodConfig.abi, signer);
        const tx = await faucet[methodConfig.method](...methodConfig.args);
        
        console.log(`  Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`  ✅ Success! Gas used: ${receipt.gasUsed}`);
        
        // 检查余额
        const usdcContract = new hre.ethers.Contract(
          usdcAddress, 
          ["function balanceOf(address) view returns (uint256)"], 
          signer
        );
        const balance = await usdcContract.balanceOf(signer.address);
        console.log(`  USDC Balance: ${hre.ethers.formatUnits(balance, 6)}`);
        
        return; // 成功后退出
        
      } catch (error) {
        console.log(`  ❌ Method failed: ${error.message.split('\n')[0]}`);
        continue;
      }
    }
  }
  
  console.log("\n❌ All automatic methods failed. Please try manual methods:");
  console.log("1. Visit: https://staging.aave.com/faucet/");
  console.log("2. Or try: https://faucet-sepolia.rockx.com/");
  console.log(`3. Your address: ${signer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });