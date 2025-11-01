import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import { WebVitalsReporter } from '@/components/web-vitals-reporter'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gestão Financeira Pessoal',
  description: 'Sistema completo de gestão financeira pessoal',
  keywords: ['finanças', 'gestão', 'controle financeiro'],
  authors: [{ name: 'Sistema Financeiro' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Gestão Financeira Pessoal',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Preconnect para performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch para Supabase */}
        <link rel="dns-prefetch" href="https://supabase.co" />
        
        {/* Meta tags de acessibilidade */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
          <WebVitalsReporter />
          <Toaster 
            position="top-right"
            richColors
            closeButton
            aria-label="Notificações"
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
