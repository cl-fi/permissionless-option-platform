import {
  ConnectButton,
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
} from '@mysten/dapp-kit'
import '@mysten/dapp-kit/dist/index.css'
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { NETWORK } from './protocol/config'
import App from './App'
import './index.css'

const { networkConfig } = createNetworkConfig({
  testnet: { url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={NETWORK}>
        <WalletProvider autoConnect>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </StrictMode>,
)

export { ConnectButton }
