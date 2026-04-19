// NOTE: This constant is for reference only. The actual service cutoff is enforced
// by the database trigger in migration 013_add_service_column.sql.
// Service assignment is automatic: < 17:00 = 'midi', >= 17:00 = 'soir'
export const SOIR_CUTOFF = '17:00'

export type Service = 'midi' | 'soir'

// Scheduled automatic recap send times (Paris timezone) — mirrors vercel.json crons.
export const RECAP_SCHEDULE_PARIS: Record<Service, string> = {
  midi: '10:30',
  soir: '17:30',
}
