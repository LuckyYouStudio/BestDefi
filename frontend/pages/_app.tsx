import '../styles/globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import type { AppProps } from 'next/app'
import ErrorBoundary from '../components/ErrorBoundary'
import ExtensionWarning from '../components/ExtensionWarning'
import '../lib/extensionHandler' // 全局扩展冲突处理
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'

const { chains, publicClient } = configureChains(
  [sepolia],
  [
    publicProvider()
  ]
)

const { connectors } = getDefaultWallets({
  appName: 'DeFi Yield Aggregator',
  projectId: '2f2d3c4e5f6a7b8c9d0e1f2a3b4c5d6e',
  chains
})

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
})

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <ExtensionWarning />
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider chains={chains}>
          <Component {...pageProps} />
        </RainbowKitProvider>
      </WagmiConfig>
    </ErrorBoundary>
  )
}

export default MyApp