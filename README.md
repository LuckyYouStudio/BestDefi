# DeFi Yield Aggregator MVP

一个简化版的DeFi利率聚合器，使用Aave V3作为收益策略，部署在Goerli测试网。

## 功能特性

- **Vault合约**：用户存入USDC，获得份额代币(yaUSDC)
- **Aave V3策略**：自动将资金存入Aave V3赚取收益
- **Keeper服务**：自动收割收益并复利
- **Web界面**：简单的存款/取款界面

## 项目结构

```
├── contracts/          # 智能合约
│   ├── Vault.sol      # 主金库合约
│   └── strategies/    # 策略合约
├── keeper/            # Go语言Keeper服务
├── frontend/          # Next.js前端
├── scripts/           # 部署脚本
└── test/             # 测试文件
```

## 快速开始

### 1. 环境配置

```bash
# 克隆项目
git clone <repository>
cd bestDefi

# 复制环境变量文件
cp .env.example .env

# 编辑.env文件，填入你的配置
# GOERLI_RPC_URL=https://goerli.infura.io/v3/YOUR_KEY
# PRIVATE_KEY=your_private_key
# ETHERSCAN_API_KEY=your_etherscan_key
```

### 2. 部署合约

```bash
# 安装依赖
npm install

# 编译合约
npm run compile

# 部署到Goerli测试网
npm run deploy:goerli
```

部署成功后会生成`deployment.json`文件，包含合约地址。

### 3. 启动Keeper服务

```bash
cd keeper

# 安装Go依赖
go mod download

# 运行Keeper
go run main.go

# 或使用Docker
docker build -t defi-keeper .
docker run -d defi-keeper
```

Keeper会每15分钟检查一次是否需要收割收益。

### 4. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 创建.env.local文件
echo "NEXT_PUBLIC_VAULT_ADDRESS=<your_vault_address>" > .env.local

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 测试网配置

### Goerli测试网地址

- **USDC**: `0xA2025B15a1757311bfD68cb14eaeFCc237AF5b43`
- **Aave Pool**: `0x368EedF3f56ad10b9bC57eed4Dac65B26Bb667f6`
- **aUSDC**: `0x1Ee669290939f8a8864497Af3BC83728715265FF`

### 获取测试代币

1. 获取Goerli ETH: https://goerlifaucet.com
2. 获取测试USDC: 使用Aave Faucet或联系项目方

## 核心功能说明

### Vault合约

- **deposit(amount)**: 存入USDC，获得份额代币
- **withdraw(shares)**: 燃烧份额代币，取回USDC
- **harvest()**: 收割收益（仅Keeper可调用）
- **getPricePerFullShare()**: 获取每份额价值

### 费用结构

- **Performance Fee**: 10% (收益的10%)
- **Management Fee**: 2% (年化管理费)

### 安全考虑

- 使用OpenZeppelin安全库
- 防重入保护
- 权限控制
- 紧急提取功能

## 开发指南

### 运行测试

```bash
# 运行合约测试
npx hardhat test

# 运行特定测试
npx hardhat test test/Vault.test.js
```

### 添加新策略

1. 在`contracts/strategies/`创建新策略合约
2. 实现`IStrategy`接口
3. 部署并通过`vault.setStrategy()`设置

### Keeper配置

编辑`.env`文件：

```
HARVEST_INTERVAL=3600        # 收割间隔(秒)
HARVEST_SCHEDULE=*/15 * * * * # Cron表达式
```

## 监控和维护

### 查看合约状态

```javascript
// 查看TVL
const tvl = await vault.balance()

// 查看APY
const apy = calculateAPY() // 基于历史数据计算

// 查看最后收割时间
const lastHarvest = await vault.lastHarvest()
```

### Keeper日志

Keeper服务会输出详细日志：
- 余额检查
- Gas价格监控
- 收割交易状态

## 注意事项

1. **测试网部署**：当前配置仅用于Goerli测试网
2. **私钥安全**：永远不要提交私钥到代码库
3. **审计**：主网部署前需要完整的安全审计
4. **Gas优化**：当前版本未进行深度Gas优化

## 后续扩展

- [ ] 添加更多收益策略(Compound, Curve等)
- [ ] 实现策略自动切换
- [ ] 添加治理代币和DAO
- [ ] 支持更多代币
- [ ] 实现跨链功能
- [ ] 添加详细的分析仪表板

## 许可证

MIT