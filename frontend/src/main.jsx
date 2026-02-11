import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import '@rainbow-me/rainbowkit/styles.css';

import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  hardhat,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

// Define RSK Testnet
const rskTestnet = {
  id: 31,
  name: 'RSK Testnet',
  network: 'rsk-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Rootstock Bitcoin',
    symbol: 'tRBTC',
  },
  rpcUrls: {
    default: { http: ['https://public-node.testnet.rsk.co'] },
    public: { http: ['https://public-node.testnet.rsk.co'] },
  },
  blockExplorers: {
    default: { name: 'RSK Explorer', url: 'https://explorer.testnet.rsk.co' },
  },
  testnet: true,
};

const config = getDefaultConfig({
  appName: 'Lending Boilerplate',
  projectId: 'YOUR_PROJECT_ID',
  chains: [hardhat, rskTestnet],
  ssr: false,
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
