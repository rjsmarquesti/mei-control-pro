'use client'

import { Printer } from 'lucide-react'

interface PrintButtonProps {
  label?: string
  className?: string
}

export function PrintButton({ label = 'Exportar PDF', className = '' }: PrintButtonProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <button
      onClick={handlePrint}
      className={`btn-outline gap-2 text-sm no-print ${className}`}
    >
      <Printer size={15} />
      {label}
    </button>
  )
}
