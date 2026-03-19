import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppSidebar } from '@/components/app-sidebar'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Smart Warehouse Allocation System',
  description: '智能仓库分配系统 - 3PL智能规划方案，优化成本，提升效率',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="flex-1 ml-64">
            <div className="container mx-auto p-6 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
