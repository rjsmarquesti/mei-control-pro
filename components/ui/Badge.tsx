import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'revenue' | 'expense' | 'completed' | 'pending' | 'cancelled' | 'default'
  className?: string
}

const variantMap = {
  revenue: 'badge-revenue',
  expense: 'badge-expense',
  completed: 'badge-completed',
  pending: 'badge-pending',
  cancelled: 'badge-cancelled',
  default: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(variantMap[variant], className)}>
      {children}
    </span>
  )
}
