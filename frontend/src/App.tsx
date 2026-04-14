import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Header } from './components/Header'
import { HealthCard } from './components/HealthCard'
import { ActionCards } from './components/ActionCards'
import { StatsGrid } from './components/StatsGrid'
import { Footer } from './components/Footer'
import { Wallet, Zap, Shield, TrendingUp } from 'lucide-react'

function WelcomeScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-24 h-24 border-2 border-[#FF9100] bg-[#050505] flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(255,145,0,0.45)] rotate-45 transition-all duration-200 ease-linear hover:rotate-90"
      >
        <Wallet className="w-12 h-12 text-[#FF9100] -rotate-45" />
      </motion.div>

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="vw-heading text-4xl md:text-5xl font-black mb-4 text-[#F5F5F5] drop-shadow-[0_0_10px_rgba(255,255,255,0.35)]"
      >
        Welcome to <span className="text-gradient">RSK Lending</span>
      </motion.h2>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-[#C8B9D9] text-lg max-w-lg mb-12"
      >
        Connect your wallet to deposit RBTC as collateral and borrow USDT0 on Rootstock's secure Bitcoin-powered network.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl"
      >
        {[
          { icon: Shield, title: 'Secure', desc: 'Built on Bitcoin security' },
          { icon: Zap, title: 'Fast', desc: 'Quick transactions' },
          { icon: TrendingUp, title: 'Efficient', desc: '70% LTV ratio' },
        ].map((item) => (
          <motion.div
            key={item.title}
            whileHover={{ scale: 1.05, y: -5 }}
            className="vw-card p-6 rounded-none transition-all duration-200 ease-linear hover:-translate-y-2 hover:shadow-[0_0_28px_rgba(255,145,0,0.26)] group"
          >
            <div className="w-12 h-12 border-2 border-[#D27CFF] bg-[#050505] flex items-center justify-center mb-4 mx-auto rotate-45 transition-transform duration-200 ease-linear group-hover:rotate-90">
              <item.icon className="w-6 h-6 text-[#FF9100] -rotate-45" />
            </div>
            <h3 className="vw-heading font-semibold text-[#F5F5F5] mb-1 drop-shadow-[0_0_6px_rgba(255,145,0,0.45)]">{item.title}</h3>
            <p className="text-sm text-[#C8B9D9]">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

function Dashboard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <StatsGrid />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthCard />
        <ActionCards />
      </div>
    </motion.div>
  )
}

function App() {
  const { isConnected } = useAccount()

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-x-0 top-[20%] mx-auto h-[380px] w-[380px] md:h-[520px] md:w-[520px] blur-[100px] bg-gradient-to-b from-[#FF9100] to-[#D27CFF] opacity-20" />
        <div className="absolute inset-x-0 bottom-[-280px] h-[420px] vw-grid-floor" />
      </div>
      <Header />

      <main className="relative z-10 flex-1 pt-28 pb-8 px-4">
        <div className="max-w-7xl mx-auto vw-dot-pattern">
          {isConnected ? <Dashboard /> : <WelcomeScreen />}
        </div>
      </main>

      <Footer />
      <div className="vw-scanlines" />
    </div>
  )
}

export default App
