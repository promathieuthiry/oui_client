import { z } from 'zod'

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{9,14}$/, 'Format de téléphone invalide (E.164 requis)')

export const bookingRowSchema = z.object({
  guest_name: z
    .string()
    .trim()
    .min(1, 'Le nom du client est obligatoire'),
  phone: z
    .string()
    .trim()
    .min(1, 'Le numéro de téléphone est obligatoire'),
  booking_date: z
    .string()
    .trim()
    .refine(
      (val) => {
        const date = new Date(val)
        if (isNaN(date.getTime())) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date >= today
      },
      { message: 'La date est dans le passé ou invalide' }
    ),
  booking_time: z
    .string()
    .trim()
    .regex(/^\d{1,2}:\d{2}$/, "Format d'heure invalide (HH:mm attendu)"),
  party_size: z
    .union([z.number(), z.string().transform(Number)])
    .pipe(
      z.number().int().positive('Le nombre de couverts doit être supérieur à 0')
    ),
})

export type BookingRow = z.infer<typeof bookingRowSchema>
