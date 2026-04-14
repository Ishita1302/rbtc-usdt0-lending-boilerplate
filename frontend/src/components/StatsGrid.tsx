import { motion } from 'framer-motion'
import { Percent, DollarSign, Landmark, Sparkles } from 'lucide-react'
import { useLtvBps } from '../hooks/useLendingPool'

export function StatsGrid() {
  const { data: ltvBps } = useLtvBps()
  const ltv = ltvBps ? Number(ltvBps) / 100 : 70

  const stats = [
    {
      icon: Percent,
      label: 'Loan-to-Value',
      value: `${ltv}%`,
      description: 'Maximum borrowing power',
      accent: '#D27CFF',
    },
    {
      icon: Landmark,
      label: 'Protocol',
      value: 'Rootstock',
      description: 'Bitcoin-powered DeFi',
      accent: '#FF9100',
    },
    {
      icon: DollarSign,
      label: 'Stablecoin',
      value: 'USDT0',
      description: 'Borrow stable assets',
      accent: '#FFFFFF',
    },
    {
      icon: Sparkles,
      label: 'Collateral',
      value: 'RBTC',
      description: 'Native Bitcoin on RSK',
      accent: '#D27CFF',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="vw-card p-4 cursor-default rounded-none transition-all duration-200 ease-linear hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(0,255,255,0.25)]"
        >
          <div className="w-10 h-10 border-2 bg-[#050505] flex items-center justify-center mb-3 rotate-45 transition-all duration-200 ease-linear" style={{ borderColor: stat.accent }}>
            <stat.icon className="w-5 h-5 -rotate-45" style={{ color: stat.accent }} />
          </div>
          <p className="text-2xl font-bold text-[#F5F5F5] mb-1 vw-heading">{stat.value}</p>
          <p className="text-sm font-medium text-[#FF9100]">{stat.label}</p>
          <p className="text-xs text-[#C8B9D9] mt-1">{stat.description}</p>
        </motion.div>
      ))}
    </div>
  )
}
