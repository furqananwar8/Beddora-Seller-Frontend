import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Repricer Dashboard | Beddora',
  description: 'Monitor pricing, competitors, and Buy Box performance',
}

export default function RepricerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
