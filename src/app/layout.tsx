import type { Metadata } from 'next'
import './globals.css'
import { RestaurantSwitcher } from '@/components/restaurant-switcher'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'OuiClient — Confirmations de réservation',
  description: 'Gestion des confirmations de réservation par SMS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <span className="text-xl font-bold text-gray-900">
                  OuiClient
                </span>
                <div className="border-l border-gray-200 pl-8">
                  <RestaurantSwitcher />
                </div>
                <a
                  href="/bookings"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Réservations
                </a>
                <a
                  href="/stats"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Statistiques
                </a>
                <a
                  href="/restaurants"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Restaurants
                </a>
              </div>
              <div className="flex items-center">
                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Déconnexion
                  </button>
                </form>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
