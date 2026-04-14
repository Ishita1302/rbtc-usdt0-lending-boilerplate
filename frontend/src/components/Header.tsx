import { motion } from 'framer-motion'
import { Wallet, ChevronDown, ExternalLink, Copy, LogOut } from 'lucide-react'
import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useState } from 'react'
import { truncateAddress, formatRBTC } from '../lib/utils'
import { rskTestnet } from '../config/wagmi'
import { VaporButton } from './ui/vapor'

export function Header() {
  const { address, isConnected } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { data: balance } = useBalance({ address })
  const [showDropdown, setShowDropdown] = useState(false)

  const isWrongNetwork = isConnected && chainId !== rskTestnet.id

  const handleConnect = () => {
    connect({ connector: injected() })
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
    }
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-40 vw-card mx-4 mt-4 px-6 py-4 rounded-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
        >
          <div className="w-10 h-10 border-2 border-[#FF9100] bg-[#050505] flex items-center justify-center shadow-[0_0_12px_rgba(255,145,0,0.38)]">
            <span className="text-[#FF9100] font-bold text-xl vw-heading">R</span>
          </div>
          <div>
            <h1 className="vw-heading font-bold text-xl text-[#F5F5F5]">RSK Lending</h1>
            <p className="text-xs text-[#C8B9D9]">&gt; DeFi on Rootstock</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-4">
          {isConnected && isWrongNetwork && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 py-2 bg-red-500/20 border-2 border-red-500/60 text-red-300 text-sm"
            >
              Wrong Network
            </motion.div>
          )}

          {!isConnected ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <VaporButton
              onClick={handleConnect}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              <Wallet className="w-5 h-5" />
              {isPending ? 'Connecting...' : 'Connect Wallet'}
              </VaporButton>
            </motion.div>
          ) : (
            <div className="relative">
              <motion.button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 px-4 py-2.5 bg-[#050505]/90 border-2 border-[#2B2B2B] hover:border-[#FF9100] transition-all duration-200 ease-linear"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-8 h-8 border border-[#D27CFF] bg-[#0E0E0E] flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-[#FF9100]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[#F5F5F5]">{truncateAddress(address!)}</p>
                  <p className="text-xs text-[#C8B9D9]">
                    {balance ? `${parseFloat(formatRBTC(balance.value)).toFixed(4)} tRBTC` : '0 tRBTC'}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#C8B9D9] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </motion.button>

              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 rounded-none vw-terminal overflow-hidden"
                >
                  <button
                    onClick={copyAddress}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FF9100]/12 transition-colors text-left"
                  >
                    <Copy className="w-4 h-4 text-[#C8B9D9]" />
                    <span className="text-sm text-[#F5F5F5]">Copy Address</span>
                  </button>
                  <a
                    href={`https://explorer.testnet.rsk.co/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FF9100]/12 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-[#C8B9D9]" />
                    <span className="text-sm text-[#F5F5F5]">View on Explorer</span>
                  </a>
                  <button
                    onClick={() => { disconnect(); setShowDropdown(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-left border-t border-[#2B2B2B]"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Disconnect</span>
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  )
}
