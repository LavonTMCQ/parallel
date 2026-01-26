import './globals.css'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Parallel // P2P Marketplace',
  description: 'Frictionless P2P Marketplace - Save 5% on every purchase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#A3E635', // lime
          colorBackground: '#0B1120', // midnight
          colorInputBackground: '#162032', // surface
          colorText: '#FFFFFF',
          colorTextSecondary: '#94A3B8', // dim
        },
        elements: {
          formButtonPrimary: 'bg-lime text-midnight hover:bg-lime/90',
          card: 'bg-surface border border-white/10',
          headerTitle: 'text-white',
          headerSubtitle: 'text-dim',
          socialButtonsBlockButton: 'bg-white/10 border-white/10 text-white hover:bg-white/20',
          formFieldInput: 'bg-midnight border-white/10 text-white',
          footerActionLink: 'text-lime hover:text-lime/80',
        },
      }}
    >
      <html lang="en">
        <body className={`${inter.variable} ${mono.variable} font-sans bg-midnight text-white`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
