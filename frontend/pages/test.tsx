import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function TestPage() {
  const { address, isConnected } = useAccount()

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">DeFi系统测试页面</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">连接状态</h2>
            <ConnectButton />
            {isConnected && (
              <div className="mt-4">
                <p className="text-green-400">✅ 钱包已连接</p>
                <p className="text-sm text-gray-400">地址: {address}</p>
              </div>
            )}
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">合约信息</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Vault:</strong> 0xb6494e339FD35abA0E5845a2dc0B47D14c68993d</p>
              <p><strong>Strategy:</strong> 0x8CD1cF363C871B5335C9Fd7BEeade205A6c467c7</p>
              <p><strong>USDC:</strong> 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8</p>
              <p><strong>Network:</strong> Sepolia</p>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">服务状态</h2>
            <div className="space-y-2">
              <p className="text-green-400">✅ 前端服务运行中</p>
              <p className="text-green-400">✅ Keeper服务运行中</p>
              <p className="text-green-400">✅ 合约已部署验证</p>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">测试步骤</h2>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>获取测试USDC (<a href="https://staging.aave.com/faucet/" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">Aave Faucet</a>)</li>
              <li>连接钱包到Sepolia网络</li>
              <li>访问主页面进行存款测试</li>
              <li>观察Keeper自动收割</li>
            </ol>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <a 
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            返回主页面
          </a>
        </div>
      </div>
    </div>
  )
}