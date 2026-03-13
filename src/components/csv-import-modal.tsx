'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface ImportResult {
  imported: number
  updated: number
  errors: { row: number; field: string; message: string }[]
}

interface ColumnMapping {
  [csvColumn: string]: string
}

interface CSVImportModalProps {
  open: boolean
  restaurantId: string
  selectedDate: string
  onImportComplete: () => void
  onCancel: () => void
}

const TARGET_FIELDS = [
  { value: '', label: '— Ignorer —' },
  { value: 'guest_name', label: 'Nom du client' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'booking_date', label: 'Date' },
  { value: 'booking_time', label: 'Heure' },
  { value: 'party_size', label: 'Couverts' },
]

function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const patterns: Record<string, RegExp> = {
    guest_name: /^(nom|name|client|guest)/i,
    phone: /^(phone|tel|telephone|téléphone|mobile|num)/i,
    booking_date: /^(date|jour|day|booking_date)/i,
    booking_time: /^(heure|time|hour|booking_time)/i,
    party_size: /^(couvert|covers|party|guest|pax|nb|nombre|size)/i,
  }

  for (const header of headers) {
    for (const [field, pattern] of Object.entries(patterns)) {
      if (pattern.test(header.trim())) {
        mapping[header] = field
        break
      }
    }
  }

  return mapping
}

export function CSVImportModal({
  open,
  restaurantId,
  selectedDate,
  onImportComplete,
  onCancel,
}: CSVImportModalProps) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [showMapper, setShowMapper] = useState(false)
  const [saveMapping, setSaveMapping] = useState(true)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetState() {
    setUploading(false)
    setResult(null)
    setError(null)
    setDateError(null)
    setDetectedHeaders([])
    setMapping({})
    setShowMapper(false)
    setFileContent(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleClose() {
    resetState()
    onCancel()
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setDateError(null)
    setResult(null)

    const text = await file.text()
    setFileContent(text)

    // Edition PMS format — convert then validate
    if (text.includes('Heure,Table,Cvts,Nom,')) {
      // Import Edition converter
      const { convertEditionCSV } = await import('@/lib/services/edition-csv-converter')

      // Convert to standard CSV
      const conversion = convertEditionCSV(text)
      const convertedCsv = conversion.csv

      // Parse converted CSV to validate dates
      const parsed = Papa.parse<Record<string, string>>(convertedCsv, {
        header: true,
        skipEmptyLines: true,
      })

      // Validate converted dates match selectedDate
      const dateValid = validateDates(parsed.data, 'booking_date', null)
      if (!dateValid) {
        return  // Stop import, error already shown
      }

      // Dates valid - proceed with import
      await performImport(text, null)  // Send original Edition format, backend will convert
      return
    }

    // Parse CSV to detect headers and validate dates
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors.length > 0) {
      setError('Erreur lors de la lecture du fichier CSV')
      return
    }

    const headers = parsed.meta.fields || []
    setDetectedHeaders(headers)

    // Check if headers match standard fields
    const standardFields = ['guest_name', 'phone', 'booking_date', 'booking_time', 'party_size']
    const isStandardFormat = standardFields.every((f) =>
      headers.some((h) => h.toLowerCase() === f)
    )

    if (isStandardFormat) {
      // Validate dates before direct import
      const dateValid = validateDates(parsed.data, 'booking_date', null)
      if (dateValid) {
        await performImport(text, null)
      }
    } else {
      // Show mapper with auto-detected mapping
      const detected = autoDetectMapping(headers)
      setMapping(detected)
      setShowMapper(true)

      // Validate dates using detected mapping
      const dateColumn = Object.entries(detected).find(([, v]) => v === 'booking_date')?.[0]
      validateDates(parsed.data, dateColumn || '', detected)
    }
  }

  function validateDates(
    rows: Record<string, string>[],
    dateColumn: string,
    columnMapping: ColumnMapping | null
  ): boolean {
    if (!dateColumn && !columnMapping) {
      setDateError("La colonne 'booking_date' est introuvable dans le fichier CSV.")
      return false
    }

    const effectiveDateColumn = dateColumn ||
      Object.entries(columnMapping || {}).find(([, v]) => v === 'booking_date')?.[0] || ''

    if (!effectiveDateColumn) {
      setDateError("La colonne 'booking_date' est introuvable dans le fichier CSV.")
      return false
    }

    const uniqueDates = new Set(
      rows.map(row => row[effectiveDateColumn]).filter(Boolean)
    )

    if (uniqueDates.size === 0) {
      setDateError("Aucune date trouvée dans le fichier CSV.")
      return false
    }

    if (uniqueDates.size !== 1 || !uniqueDates.has(selectedDate)) {
      const dates = Array.from(uniqueDates).map(d => formatDate(d)).join(', ')
      setDateError(
        `Les dates du fichier CSV ne correspondent pas à la date sélectionnée (${formatDate(selectedDate)}). Dates trouvées : ${dates}`
      )
      return false
    }

    setDateError(null)
    return true
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  async function validateAndImport(
    csvText: string,
    columnMapping: ColumnMapping | null,
    skipValidation = false
  ) {
    if (!skipValidation) {
      // Re-parse and validate dates before import
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      })

      const dateColumn = columnMapping
        ? Object.entries(columnMapping).find(([, v]) => v === 'booking_date')?.[0]
        : 'booking_date'

      const isValid = validateDates(parsed.data, dateColumn || '', columnMapping)
      if (!isValid) {
        return
      }
    }

    await performImport(csvText, columnMapping)
  }

  async function performImport(
    csvText: string,
    columnMapping: ColumnMapping | null
  ) {
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', new Blob([csvText], { type: 'text/csv' }), 'import.csv')
      formData.append('restaurant_id', restaurantId)
      formData.append('expected_date', selectedDate)
      if (columnMapping) {
        formData.append('mapping', JSON.stringify(columnMapping))
      }
      if (saveMapping && columnMapping) {
        formData.append('save_mapping', 'true')
      }

      const response = await fetch('/api/bookings/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'import")
      }

      const data: ImportResult = await response.json()
      setResult(data)
      setShowMapper(false)

      // Auto-close on success after a brief delay
      if (data.imported > 0 || data.updated > 0) {
        setTimeout(() => {
          onImportComplete()
          resetState()
        }, 1500)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'import du fichier"
      )
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleMappingChange(csvColumn: string, targetField: string) {
    setMapping((prev) => {
      const next = { ...prev }
      if (targetField === '') {
        delete next[csvColumn]
      } else {
        next[csvColumn] = targetField
      }
      return next
    })
  }

  async function handleConfirmMapping() {
    if (!fileContent) return
    await validateAndImport(fileContent, mapping)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des réservations</DialogTitle>
          <DialogDescription>
            Téléchargez un fichier CSV pour importer des réservations pour le{' '}
            {formatDate(selectedDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="csv-file"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Fichier CSV
            </label>
            <input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
          </div>

          {dateError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {dateError}
            </div>
          )}

          {showMapper && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-900">
                Mapping des colonnes
              </h3>
              <p className="text-sm text-gray-500">
                Associez chaque colonne du fichier CSV au champ correspondant.
              </p>

              <div className="space-y-2">
                {detectedHeaders.map((header) => (
                  <div key={header} className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700 w-40 truncate font-mono">
                      {header}
                    </span>
                    <span className="text-gray-400">→</span>
                    <select
                      value={mapping[header] || ''}
                      onChange={(e) =>
                        handleMappingChange(header, e.target.value)
                      }
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TARGET_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="save-mapping"
                  type="checkbox"
                  checked={saveMapping}
                  onChange={(e) => setSaveMapping(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="save-mapping" className="text-sm text-gray-600">
                  Sauvegarder ce mapping pour les prochains imports
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleConfirmMapping}
                  disabled={uploading || !!dateError}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {uploading ? 'Import en cours...' : 'Importer'}
                </button>
                <button
                  onClick={() => {
                    setShowMapper(false)
                    setFileContent(null)
                    setDateError(null)
                  }}
                  className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {uploading && !showMapper && (
            <p className="text-sm text-gray-500">Import en cours...</p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                <p>
                  {result.imported} réservation(s) importée(s)
                  {result.updated > 0 && `, ${result.updated} mise(s) à jour`}
                </p>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm">
                  <p className="font-medium mb-2">
                    {result.errors.length} erreur(s) :
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.errors.map((err) => (
                      <li key={`${err.row}-${err.field}`}>
                        Ligne {err.row} ({err.field}) : {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
