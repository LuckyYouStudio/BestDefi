import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, VAULT_ABI, ERC20_ABI } from '../lib/contracts'

export default function Home() {
  const { address, isConnected } = useAccount()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isDepositing, setIsDepositing] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: usdcBalance } = useContractRead({
    address: CONTRACTS.USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    watch: true,
  })

  const { data: shareBalance } = useContractRead({
    address: CONTRACTS.VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: [address],
    watch: true,
  })

  const { data: totalSupply } = useContractRead({
    address: CONTRACTS.VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'totalSupply',
    watch: true,
  })

  const { data: vaultBalance } = useContractRead({
    address: CONTRACTS.VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'balance',
    watch: true,
  })

  const { data: pricePerShare } = useContractRead({
    address: CONTRACTS.VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'getPricePerFullShare',
    watch: true,
  })

  const { data: allowance } = useContractRead({
    address: CONTRACTS.USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, CONTRACTS.VAULT],
    watch: true,
  })

  const depositAmountParsed = useMemo(() => {
    try {
      return depositAmount ? ethers.parseUnits(depositAmount, 6) : 0n
    } catch {
      return 0n
    }
  }, [depositAmount])

  const withdrawAmountParsed = useMemo(() => {
    try {
      return withdrawAmount ? ethers.parseUnits(withdrawAmount, 18) : 0n
    } catch {
      return 0n
    }
  }, [withdrawAmount])

  const { config: approveConfig } = usePrepareContractWrite({
    address: CONTRACTS.USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [CONTRACTS.VAULT, depositAmountParsed],
    enabled: depositAmountParsed > 0n,
  })

  const { write: approve, data: approveData } = useContractWrite(approveConfig)
  const { isLoading: approveLoading } = useWaitForTransaction({
    hash: approveData?.hash,
    onSuccess: () => {
      setIsApproving(false)
      setError(null)
    },
    onError: (err) => {
      setIsApproving(false)
      setError('授权失败: ' + err.message)
    },
  })

  const { config: depositConfig } = usePrepareContractWrite({
    address: CONTRACTS.VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'deposit',
    args: [depositAmountParsed],
    enabled: depositAmountParsed > 0n && allowance && (allowance as bigint) >= depositAmountParsed,
  })

  const { write: deposit, data: depositData } = useContractWrite(depositConfig)
  const { isLoading: depositLoading } = useWaitForTransaction({
    hash: depositData?.hash,
    onSuccess: () => {
      setIsDepositing(false)
      setDepositAmount('')
      setError(null)
    },
    onError: (err) => {
      setIsDepositing(false)
      setError('存入失败: ' + err.message)
    },
  })

  const { config: withdrawConfig } = usePrepareContractWrite({
    address: CONTRACTS.VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'withdraw',
    args: [withdrawAmountParsed],
    enabled: withdrawAmountParsed > 0n && shareBalance && withdrawAmountParsed <= (shareBalance as bigint),
  })

  const { write: withdraw, data: withdrawData } = useContractWrite(withdrawConfig)
  const { isLoading: withdrawLoading } = useWaitForTransaction({
    hash: withdrawData?.hash,
    onSuccess: () => {
      setIsWithdrawing(false)
      setWithdrawAmount('')
      setError(null)
    },
    onError: (err) => {
      setIsWithdrawing(false)
      setError('提取失败: ' + err.message)
    },
  })

  const handleDeposit = useCallback(async () => {
    if (!depositAmount || depositAmountParsed === 0n) {
      setError('请输入有效的存入金额')
      return
    }

    if (!usdcBalance || (usdcBalance as bigint) < depositAmountParsed) {
      setError('USDC 余额不足')
      return
    }

    setError(null)
    
    try {
      if (allowance && (allowance as bigint) < depositAmountParsed) {
        setIsApproving(true)
        approve?.()
      } else {
        setIsDepositing(true)
        deposit?.()
      }
    } catch (err: any) {
      setError(err.message)
      setIsApproving(false)
      setIsDepositing(false)
    }
  }, [depositAmount, depositAmountParsed, usdcBalance, allowance, approve, deposit])

  const handleWithdraw = useCallback(async () => {
    if (!withdrawAmount || withdrawAmountParsed === 0n) {
      setError('请输入有效的提取金额')
      return
    }

    if (!shareBalance || (shareBalance as bigint) < withdrawAmountParsed) {
      setError('份额余额不足')
      return
    }

    setError(null)
    
    try {
      setIsWithdrawing(true)
      withdraw?.()
    } catch (err: any) {
      setError(err.message)
      setIsWithdrawing(false)
    }
  }, [withdrawAmount, withdrawAmountParsed, shareBalance, withdraw])

  const formatBalance = useCallback((balance: any, decimals: number) => {
    if (!balance) return '0'
    try {
      const formatted = ethers.formatUnits(balance, decimals)
      const num = parseFloat(formatted)
      return num.toFixed(decimals === 6 ? 2 : 4)
    } catch {
      return '0'
    }
  }, [])

  const calculateAPY = useCallback(() => {
    return '12.5'
  }, [])

  const userValue = useMemo(() => {
    if (!shareBalance || !pricePerShare) return '0'
    try {
      const value = (BigInt(shareBalance as any) * BigInt(pricePerShare as any)) / BigInt(10 ** 18)
      return formatBalance(value, 6)
    } catch {
      return '0'
    }
  }, [shareBalance, pricePerShare, formatBalance])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <header className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">DeFi 收益聚合器</h1>
        <ConnectButton />
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* 操作说明 */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
            <h3 className="text-blue-400 font-semibold mb-2">💡 使用说明</h3>
            <p className="text-sm text-gray-300">
              1. 连接钱包到 Sepolia 测试网 | 2. 获取测试 USDC：
              <a href="https://staging.aave.com/faucet/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">
                Aave Faucet
              </a> | 
              3. 存入 USDC 开始赚取收益 | 4. Keeper 服务自动复利
            </p>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="max-w-4xl mx-auto mb-4">
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-red-400">⚠️ {error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* 未连接钱包时的提示 */}
          {!isConnected && (
            <div className="col-span-full bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-6 text-center">
              <h3 className="text-yellow-400 font-semibold mb-2">🔗 请连接钱包</h3>
              <p className="text-gray-300 mb-4">
                连接你的钱包以查看余额和进行交易
              </p>
            </div>
          )}
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">金库统计</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">总锁仓价值</span>
                <span className="font-mono">
                  ${formatBalance(vaultBalance, 6)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">年化收益率</span>
                <span className="font-mono text-green-400">{calculateAPY()}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">份额价格</span>
                <span className="font-mono">
                  {formatBalance(pricePerShare, 18)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">总份额</span>
                <span className="font-mono">
                  {formatBalance(totalSupply, 18)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">我的仓位</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">USDC 余额</span>
                <span className="font-mono">
                  {formatBalance(usdcBalance, 6)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">持有份额</span>
                <span className="font-mono">
                  {formatBalance(shareBalance, 18)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">总价值</span>
                <span className="font-mono">
                  {userValue} USDC
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">存入资金</h2>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="USDC 数量"
                value={depositAmount}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setDepositAmount(value)
                    setError(null)
                  }
                }}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {/* 无USDC余额提示 */}
              {isConnected && (usdcBalance as bigint) === 0n && (
                <div className="text-sm text-yellow-400 bg-yellow-900/20 p-3 rounded-lg">
                  💰 你需要先获取测试 USDC，
                  <a href="https://staging.aave.com/faucet/" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-300 ml-1">
                    点击获取
                  </a>
                </div>
              )}
              
              <button
                onClick={handleDeposit}
                disabled={!isConnected || isApproving || isDepositing || !depositAmount}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
              >
                {!isConnected 
                  ? '请先连接钱包'
                  : isApproving
                  ? '授权中...'
                  : isDepositing
                  ? '存入中...'
                  : allowance && depositAmountParsed > (allowance as bigint)
                  ? '授权并存入'
                  : '存入'}
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">提取资金</h2>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="份额数量"
                value={withdrawAmount}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setWithdrawAmount(value)
                    setError(null)
                  }
                }}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {/* 可用份额提示 */}
              {isConnected && shareBalance && (shareBalance as bigint) > 0n && (
                <div className="text-sm text-gray-400">
                  📊 可提取份额: {formatBalance(shareBalance, 18)}
                  <button 
                    onClick={() => setWithdrawAmount(formatBalance(shareBalance, 18))}
                    className="ml-2 text-blue-400 hover:text-blue-300 underline"
                  >
                    全部提取
                  </button>
                </div>
              )}
              
              {isConnected && (!shareBalance || (shareBalance as bigint) === 0n) && (
                <div className="text-sm text-gray-400 bg-gray-900/50 p-3 rounded-lg">
                  📈 你还没有存入任何资金，请先存入 USDC
                </div>
              )}
              
              <button
                onClick={handleWithdraw}
                disabled={!isConnected || isWithdrawing || !withdrawAmount || !shareBalance || (shareBalance as bigint) === 0n}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
              >
                {!isConnected 
                  ? '请先连接钱包'
                  : isWithdrawing 
                  ? '提取中...' 
                  : (!shareBalance || (shareBalance as bigint) === 0n)
                  ? '暂无可提取资金'
                  : '提取'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-400">
          <p>策略：Aave V3 (Sepolia 测试网)</p>
          <p className="mt-2">收益分成：10% | 管理费：2% 年化</p>
          
          {/* 页面导航 */}
          <div className="mt-8 flex justify-center space-x-4 text-sm">
            <a href="/test" className="text-blue-400 hover:text-blue-300 hover:underline">
              🧪 测试页面
            </a>
            <span className="text-gray-600">|</span>
            <a href="/simple" className="text-green-400 hover:text-green-300 hover:underline">
              ⚡ 简化版本
            </a>
            <span className="text-gray-600">|</span>
            <a 
              href="https://github.com/LuckyYouStudio/BestDefi" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-300 hover:underline"
            >
              📖 源码
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}