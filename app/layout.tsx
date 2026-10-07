import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import CookieBanner from '@/components/ui/CookieBanner'
import './globals.css'

export const metadata: Metadata = {
  title: 'MEI Control Pro — Gestão Financeira para MEI',
  description: 'Controle financeiro completo para Microempreendedores Individuais. Faturamento, DAS, IRPF e muito mais.',
  icons: { icon: '/favicon.ico', apple: '/icons/icon-192.png' },
  manifest: '/manifest.json',
  themeColor: '#7C3AED',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MEI Pro',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  )
}
