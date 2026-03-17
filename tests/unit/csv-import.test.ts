import { describe, it, expect, vi } from 'vitest'
import { importCSV } from '@/lib/services/csv-import'

describe('importCSV', () => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const makeCSV = (rows: string[]) =>
    ['guest_name,phone,booking_date,booking_time,party_size', ...rows].join(
      '\n'
    )

  const mockDb = () => ({
    upsertBooking: vi.fn().mockResolvedValue({ isNew: true }),
  })

  it('should import valid CSV rows', async () => {
    const csv = makeCSV([
      `Jean Dupont,0612345678,${tomorrow},19:30,4`,
      `Marie Martin,0698765432,${tomorrow},20:00,2`,
    ])

    const db = mockDb()
    const result = await importCSV(csv, 'rest-1', db)

    expect(result.imported).toBe(2)
    expect(result.errors).toHaveLength(0)
    expect(db.upsertBooking).toHaveBeenCalledTimes(2)
  })

  it('should convert phone to E.164 format', async () => {
    const csv = makeCSV([`Jean,06 12 34 56 78,${tomorrow},19:30,4`])

    const db = mockDb()
    await importCSV(csv, 'rest-1', db)

    expect(db.upsertBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '+33612345678',
      })
    )
  })

  it('should report errors for invalid rows', async () => {
    const csv = makeCSV([
      `Jean,invalid-phone,${tomorrow},19:30,4`,
      `Marie,0698765432,2020-01-01,20:00,2`,
      `,0612345678,${tomorrow},19:30,0`,
    ])

    const db = mockDb()
    const result = await importCSV(csv, 'rest-1', db)

    // Invalid phone row is now saved with invalid_number status (not rejected)
    // Past date and empty name/party_size rows still produce errors
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some((e) => e.field === 'booking_date')).toBe(true)

    // The invalid phone row should be upserted with invalid_number status
    expect(db.upsertBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: 'invalid-phone',
        status: 'invalid_number',
        error_reason: 'Format invalide: invalid-phone',
      })
    )
  })

  it('should save bookings with invalid phone as invalid_number', async () => {
    const csv = makeCSV([`Jean Dupont,123456,${tomorrow},19:00,2`])

    const db = mockDb()
    const result = await importCSV(csv, 'rest-1', db)

    expect(result.imported).toBe(1)
    expect(result.errors).toHaveLength(0)
    expect(db.upsertBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_name: 'Jean Dupont',
        phone: '123456',
        status: 'invalid_number',
        error_reason: 'Format invalide: 123456',
      })
    )
  })

  it('should apply column mapping', async () => {
    const csv = [
      'Nom,Telephone,Date,Heure,Couverts',
      `Jean Dupont,0612345678,${tomorrow},19:30,4`,
    ].join('\n')

    const mapping = {
      Nom: 'guest_name',
      Telephone: 'phone',
      Date: 'booking_date',
      Heure: 'booking_time',
      Couverts: 'party_size',
    }

    const db = mockDb()
    const result = await importCSV(csv, 'rest-1', db, mapping)

    expect(result.imported).toBe(1)
    expect(result.errors).toHaveLength(0)
  })

  it('should handle re-import (update existing)', async () => {
    const csv = makeCSV([`Jean,0612345678,${tomorrow},19:30,4`])

    const db = {
      upsertBooking: vi.fn().mockResolvedValue({ isNew: false }),
    }
    const result = await importCSV(csv, 'rest-1', db)

    expect(result.imported).toBe(0)
    expect(result.updated).toBe(1)
  })

  it('should handle empty CSV', async () => {
    const csv = 'guest_name,phone,booking_date,booking_time,party_size\n'

    const db = mockDb()
    const result = await importCSV(csv, 'rest-1', db)

    expect(result.imported).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('should handle CSV values with commas in quotes', async () => {
    // Test that PapaParse correctly handles quoted values containing commas
    const csv = [
      'guest_name,phone,booking_date,booking_time,party_size',
      `"Dupont, Jean",0612345678,${tomorrow},19:30,4`,
      `"Martin, Marie-Claire",0698765432,${tomorrow},20:00,2`,
    ].join('\n')

    const db = mockDb()
    const result = await importCSV(csv, 'rest-1', db)

    expect(result.imported).toBe(2)
    expect(result.errors).toHaveLength(0)
    expect(db.upsertBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_name: 'Dupont, Jean',
        phone: '+33612345678',
      })
    )
    expect(db.upsertBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_name: 'Martin, Marie-Claire',
        phone: '+33698765432',
      })
    )
  })
})
