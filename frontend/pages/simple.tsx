// 简单版本页面，避免扩展冲突
import { useEffect, useState } from 'react'

export default function SimplePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="p-6 border-b border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">DeFi Yield Aggregator (简单版)</h1>
          <p className="text-gray-400 mt-2">避免浏览器扩展冲突的简化界面</p>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* 系统状态 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🚀 系统状态</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-green-400">✅ 前端服务: 运行中</p>
                <p className="text-green-400">✅ Keeper服务: 监控中</p>
                <p className="text-green-400">✅ 合约已部署验证</p>
              </div>
              <div className="space-y-2">
                <p><strong>网络:</strong> Sepolia测试网</p>
                <p><strong>前端:</strong> localhost:3000</p>
                <p><strong>测试页:</strong> localhost:3000/test</p>
              </div>
            </div>
          </div>

          {/* 合约信息 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📋 合约信息</h2>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Vault合约:</span>
                <a 
                  href="https://sepolia.etherscan.io/address/0xb6494e339FD35abA0E5845a2dc0B47D14c68993d#code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  0xb6494e339FD35abA0E5845a2dc0B47D14c68993d
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Strategy合约:</span>
                <a 
                  href="https://sepolia.etherscan.io/address/0x8CD1cF363C871B5335C9Fd7BEeade205A6c467c7#code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  0x8CD1cF363C871B5335C9Fd7BEeade205A6c467c7
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">USDC Token:</span>
                <span className="text-yellow-400">0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8</span>
              </div>
            </div>
          </div>

          {/* 获取测试币 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">💰 获取测试代币</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-blue-400">1. 获取Sepolia ETH</h3>
                <p className="text-sm text-gray-400">用于支付gas费用</p>
                <a 
                  href="https://sepoliafaucet.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
                >
                  获取 Sepolia ETH
                </a>
              </div>
              
              <div>
                <h3 className="font-semibold text-green-400">2. 获取测试USDC</h3>
                <p className="text-sm text-gray-400">用于存入Vault进行测试</p>
                <a 
                  href="https://staging.aave.com/faucet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition"
                >
                  获取 USDC (Aave Faucet)
                </a>
              </div>
            </div>
          </div>

          {/* 使用指南 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibte mb-4">📖 使用指南</h2>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>确保钱包切换到Sepolia测试网</li>
              <li>获取测试ETH和USDC代币</li>
              <li>访问主页面 <code className="bg-gray-700 px-2 py-1 rounded">localhost:3000</code></li>
              <li>连接钱包并存入USDC到Vault</li>
              <li>Keeper服务会自动管理资金并复利</li>
              <li>可以随时提取本金和收益</li>
            </ol>
          </div>

          {/* 链接 */}
          <div className="flex flex-wrap gap-4 justify-center">
            <a 
              href="/"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
            >
              主界面 (完整功能)
            </a>
            <a 
              href="/test"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
            >
              测试页面
            </a>
            <a 
              href="https://github.com/LuckyYouStudio/BestDefi"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition"
            >
              GitHub 源码
            </a>
          </div>

          {/* 扩展冲突说明 */}
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4">
            <h3 className="text-yellow-400 font-semibold mb-2">⚠️ 关于浏览器扩展冲突</h3>
            <p className="text-sm text-gray-300">
              如果主界面出现错误，这通常是由于某些浏览器扩展（如Conflux钱包）与页面产生冲突。
              这不影响实际功能，您可以：
            </p>
            <ul className="text-sm text-gray-300 mt-2 list-disc list-inside">
              <li>刷新页面重试</li>
              <li>暂时禁用相关扩展</li>
              <li>使用无痕模式访问</li>
              <li>使用此简化版本进行操作</li>
            </ul>
          </div>

        </div>
      </main>
    </div>
  )
}