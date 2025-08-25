import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, VAULT_ABI, ERC20_ABI } from '../lib/contracts'

export default function Home() {
  const { address, isConnected } = useAccount()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isDepositing, setIsDepositing] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)

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

  const { config: approveConfig } = usePrepareContractWrite({
    address: CONTRACTS.USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [CONTRACTS.VAULT, ethers.parseUnits(depositAmount || '0', 6)],
  })

  const { write: approve, data: approveData } = useContractWrite(approveConfig)
  const { isLoading: approveLoading } = useWaitForTransaction({
    hash: approveData?.hash,
    onSuccess: () => {
      setIsApproving(false)
    },
  })

  const { config: depositConfig } = usePrepareContractWrite({
    address: CONTRACTS.VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'deposit',
    args: [ethers.parseUnits(depositAmount || '0', 6)],
  })

  const { write: deposit, data: depositData } = useContractWrite(depositConfig)
  const { isLoading: depositLoading } = useWaitForTransaction({
    hash: depositData?.hash,
    onSuccess: () => {
      setIsDepositing(false)
      setDepositAmount('')
    },
  })

  const { config: withdrawConfig } = usePrepareContractWrite({
    address: CONTRACTS.VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'withdraw',
    args: [ethers.parseUnits(withdrawAmount || '0', 18)],
  })

  const { write: withdraw, data: withdrawData } = useContractWrite(withdrawConfig)
  const { isLoading: withdrawLoading } = useWaitForTransaction({
    hash: withdrawData?.hash,
    onSuccess: () => {
      setIsWithdrawing(false)
      setWithdrawAmount('')
    },
  })

  const handleDeposit = async () => {
    if (!depositAmount) return

    const amount = ethers.parseUnits(depositAmount, 6)
    if (allowance && allowance < amount) {
      setIsApproving(true)
      approve?.()
    } else {
      setIsDepositing(true)
      deposit?.()
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount) return
    setIsWithdrawing(true)
    withdraw?.()
  }

  const formatBalance = (balance: any, decimals: number) => {
    if (!balance) return '0'
    return ethers.formatUnits(balance, decimals)
  }

  const calculateAPY = () => {
    return '12.5'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <header className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">DeFi Yield Aggregator</h1>
        <ConnectButton />
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Vault Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">TVL</span>
                <span className="font-mono">
                  ${formatBalance(vaultBalance, 6)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">APY</span>
                <span className="font-mono text-green-400">{calculateAPY()}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Share Price</span>
                <span className="font-mono">
                  {formatBalance(pricePerShare, 18)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Shares</span>
                <span className="font-mono">
                  {formatBalance(totalSupply, 18)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Your Position</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">USDC Balance</span>
                <span className="font-mono">
                  {formatBalance(usdcBalance, 6)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Shares</span>
                <span className="font-mono">
                  {formatBalance(shareBalance, 18)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Value</span>
                <span className="font-mono">
                  {shareBalance && pricePerShare
                    ? formatBalance(
                        (BigInt(shareBalance) * BigInt(pricePerShare)) / BigInt(10 ** 18),
                        6
                      )
                    : '0'}{' '}
                  USDC
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Deposit</h2>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Amount in USDC"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleDeposit}
                disabled={!isConnected || isApproving || isDepositing || !depositAmount}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
              >
                {isApproving
                  ? 'Approving...'
                  : isDepositing
                  ? 'Depositing...'
                  : allowance && ethers.parseUnits(depositAmount || '0', 6) > allowance
                  ? 'Approve & Deposit'
                  : 'Deposit'}
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Withdraw</h2>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Amount in shares"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleWithdraw}
                disabled={!isConnected || isWithdrawing || !withdrawAmount}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
              >
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-400">
          <p>Strategy: Aave V3 on Goerli Testnet</p>
          <p className="mt-2">Performance Fee: 10% | Management Fee: 2%</p>
        </div>
      </main>
    </div>
  )
}