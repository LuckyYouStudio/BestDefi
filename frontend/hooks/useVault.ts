import { useAccount, useContractRead, useContractReads } from 'wagmi'
import { useMemo } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, VAULT_ABI, ERC20_ABI } from '../lib/contracts'

export function useVaultData() {
  const { address } = useAccount()

  const { data, isError, isLoading } = useContractReads({
    contracts: [
      {
        address: CONTRACTS.USDC as `0x${string}`,
        abi: ERC20_ABI as any,
        functionName: 'balanceOf',
        args: [address],
      },
      {
        address: CONTRACTS.VAULT as `0x${string}`,
        abi: VAULT_ABI as any,
        functionName: 'balanceOf',
        args: [address],
      },
      {
        address: CONTRACTS.VAULT as `0x${string}`,
        abi: VAULT_ABI as any,
        functionName: 'totalSupply',
      },
      {
        address: CONTRACTS.VAULT as `0x${string}`,
        abi: VAULT_ABI as any,
        functionName: 'balance',
      },
      {
        address: CONTRACTS.VAULT as `0x${string}`,
        abi: VAULT_ABI as any,
        functionName: 'getPricePerFullShare',
      },
      {
        address: CONTRACTS.USDC as `0x${string}`,
        abi: ERC20_ABI as any,
        functionName: 'allowance',
        args: [address, CONTRACTS.VAULT],
      },
    ],
    watch: true,
    cacheTime: 2_000,
    staleTime: 2_000,
  })

  const [
    usdcBalance,
    shareBalance,
    totalSupply,
    vaultBalance,
    pricePerShare,
    allowance,
  ] = data || []

  const userValue = useMemo(() => {
    if (!shareBalance?.result || !pricePerShare?.result) return 0n
    try {
      return (BigInt(shareBalance.result as any) * BigInt(pricePerShare.result as any)) / BigInt(10 ** 18)
    } catch {
      return 0n
    }
  }, [shareBalance, pricePerShare])

  const apy = useMemo(() => {
    // 可以从链上事件计算真实 APY
    return 12.5
  }, [])

  return {
    usdcBalance: usdcBalance?.result ? BigInt(usdcBalance.result as any) : undefined,
    shareBalance: shareBalance?.result ? BigInt(shareBalance.result as any) : undefined,
    totalSupply: totalSupply?.result ? BigInt(totalSupply.result as any) : undefined,
    vaultBalance: vaultBalance?.result ? BigInt(vaultBalance.result as any) : undefined,
    pricePerShare: pricePerShare?.result ? BigInt(pricePerShare.result as any) : undefined,
    allowance: allowance?.result ? BigInt(allowance.result as any) : undefined,
    userValue,
    apy,
    isLoading,
    isError,
  }
}

export function formatBalance(balance: bigint | undefined, decimals: number): string {
  if (!balance) return '0'
  try {
    const formatted = ethers.formatUnits(balance, decimals)
    const num = parseFloat(formatted)
    if (num < 0.01 && num > 0) return '< 0.01'
    return num.toFixed(decimals === 6 ? 2 : 4)
  } catch {
    return '0'
  }
}

export function parseAmount(amount: string, decimals: number): bigint | null {
  try {
    if (!amount || amount === '') return null
    return ethers.parseUnits(amount, decimals)
  } catch {
    return null
  }
}