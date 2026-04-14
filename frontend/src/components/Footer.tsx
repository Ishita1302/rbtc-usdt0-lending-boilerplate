import { motion } from 'framer-motion'
import { Github, ExternalLink, Heart } from 'lucide-react'

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="mt-auto py-8 px-4 relative z-10"
    >
      <div className="max-w-7xl mx-auto">
        <div className="vw-card p-6 rounded-none flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#C8B9D9]">
            <span>Built with</span>
            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
            <span>on</span>
            <span className="text-gradient font-semibold vw-heading">Rootstock</span>
          </div>
          
          <div className="flex items-center gap-6">
            <a
              href="https://rootstock.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#C8B9D9] hover:text-[#FF9100] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Rootstock</span>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#C8B9D9] hover:text-[#FF9100] transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="text-sm">GitHub</span>
            </a>
          </div>

          <p className="text-xs text-[#C8B9D9]">
            Educational boilerplate. NOT for production use.
          </p>
        </div>
      </div>
    </motion.footer>
  )
}
