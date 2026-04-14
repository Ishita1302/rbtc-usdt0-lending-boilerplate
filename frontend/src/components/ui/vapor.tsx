import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

type VaporCardProps = {
  children: ReactNode
  className?: string
}

export function VaporCard({ children, className }: VaporCardProps) {
  return <div className={cn('vw-card rounded-none', className)}>{children}</div>
}

type VaporButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  labelClassName?: string
}

export function VaporButton({ className, children, labelClassName, ...props }: VaporButtonProps) {
  return (
    <button className={cn('vw-btn rounded-none px-5 py-3 font-medium', className)} {...props}>
      <span className={cn('inline-flex items-center justify-center gap-2', labelClassName)}>{children}</span>
    </button>
  )
}

export const VaporInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('vw-input', className)} {...props} />
  ),
)

VaporInput.displayName = 'VaporInput'
