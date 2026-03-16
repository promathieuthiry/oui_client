'use client'

import { useState, useEffect, useRef } from 'react'
import { useRestaurants } from '@/lib/hooks/use-restaurants'
import { mutate } from 'swr'

export function RestaurantSwitcher() {
  const { restaurants, activeRestaurantId, isLoading } = useRestaurants()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  async function handleSwitch(restaurantId: string) {
    const res = await fetch('/api/restaurants/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: restaurantId }),
    })
    if (res.ok) {
      await mutate('/api/restaurants')
      setOpen(false)
    }
  }

  if (isLoading) {
    return <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
  }

  if (restaurants.length === 0) return null

  const active = restaurants.find((r) => r.id === activeRestaurantId) ?? restaurants[0]

  if (restaurants.length === 1) {
    return (
      <span className="text-sm font-medium text-gray-600">{active.name}</span>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        {active.name}
        <svg
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          {restaurants.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                if (r.id !== active.id) handleSwitch(r.id)
                else setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {r.id === active.id ? (
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="h-4 w-4" />
              )}
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
