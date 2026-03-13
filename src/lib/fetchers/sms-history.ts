import { createClient } from '@/lib/supabase/client'

export interface SmsSend {
  id: string
  booking_id: string
  octopush_ticket: string | null
  status: string
  attempts: number
  last_attempt_at: string | null
  delivery_status: string | null
  error_message: string | null
  created_at: string
}

export interface SmsReply {
  id: string
  booking_id: string
  raw_text: string
  interpretation: 'oui' | 'non' | 'unknown'
  octopush_message_id: string | null
  received_at: string
  created_at: string
}

export interface SmsHistory {
  sends: SmsSend[]
  replies: SmsReply[]
}

export async function fetchSmsHistory(bookingId: string): Promise<SmsHistory> {
  const supabase = createClient()

  const [sendsResult, repliesResult] = await Promise.all([
    supabase
      .from('sms_sends')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true }),
    supabase
      .from('sms_replies')
      .select('*')
      .eq('booking_id', bookingId)
      .order('received_at', { ascending: true }),
  ])

  if (sendsResult.error) throw sendsResult.error
  if (repliesResult.error) throw repliesResult.error

  return {
    sends: sendsResult.data || [],
    replies: repliesResult.data || [],
  }
}
