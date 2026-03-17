'use client'

import { useState, type KeyboardEvent } from 'react'
import { isValidEmail } from '@/lib/utils/email'

interface EmailTagInputProps {
  label: string
  emails: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
  readOnly?: boolean
}

export function EmailTagInput({
  label,
  emails,
  onChange,
  placeholder = 'email@exemple.com',
  readOnly = false,
}: EmailTagInputProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function addEmail() {
    const trimmed = input.trim()
    if (!trimmed) return

    if (!isValidEmail(trimmed)) {
      setError('Email invalide')
      return
    }

    if (emails.includes(trimmed.toLowerCase())) {
      setError('Email déjà ajouté')
      return
    }

    onChange([...emails, trimmed.toLowerCase()])
    setInput('')
    setError(null)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addEmail()
    }
    if (e.key === 'Backspace' && input === '' && emails.length > 0) {
      onChange(emails.slice(0, -1))
    }
  }

  function removeEmail(index: number) {
    onChange(emails.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-md px-2 py-1.5 min-h-[38px] bg-white focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
        {emails.map((email, i) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-sm px-2 py-0.5 rounded"
          >
            {email}
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeEmail(i)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
          <input
            type="email"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            onBlur={addEmail}
            placeholder={emails.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[140px] border-none outline-none text-sm bg-transparent py-0.5"
          />
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
