/** Core TypeScript types for AquaWatch Africa. */

export type WaterPointType = 'borehole' | 'river' | 'lake' | 'reservoir' | 'spring' | 'piped'
export type WaterStatus = 'safe' | 'warning' | 'danger'
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low'
export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface WaterPoint {
  id: string
  name: string
  type: WaterPointType
  country: string | null
  region: string | null
  latitude: number
  longitude: number
  depth_m: number | null
  geology: string | null
  population: number
  status: WaterStatus
  quality_score: number
  last_tested: string | null
  last_serviced: string | null
  ndwi: number | null
  created_at: string
}

export interface Reading {
  id: string
  water_point_id: string
  recorded_at: string
  ph: number
  tds: number
  turbidity: number
  fluoride: number
  nitrate: number
  coliform: number
  water_level: number | null
  pump_yield: number | null
  source: 'manual' | 'sensor' | 'lab' | 'satellite'
  notes: string | null
}

export interface ServiceLog {
  id: string
  water_point_id: string
  scheduled_date: string
  completed_date: string | null
  service_type: string
  urgency: UrgencyLevel
  triggered_by: string[] | null
  technician: string | null
  cost_usd: number | null
  notes: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  before_score: number | null
  after_score: number | null
  created_at: string
}

export interface TreatmentStep {
  step: number
  method: string
  materials: string
  duration: string
  cost_usd: number
}

export interface TreatmentPlan {
  id: string
  water_point_id: string
  generated_at: string
  ai_model: string | null
  summary: string
  urgency: UrgencyLevel
  immediate_actions: string[] | null
  treatment_steps: TreatmentStep[] | null
  prevention_tips: string[] | null
  next_test_date: string | null
  next_service_date: string | null
  estimated_cost_usd: number | null
  safe_to_drink: boolean
  boil_water_advisory: boolean
}

export interface Alert {
  id: string
  water_point_id: string
  severity: AlertSeverity
  message: string
  sms_sent: boolean
  resolved: boolean
  resolved_at: string | null
  created_at: string
  water_point_name?: string
}

export interface ServiceAssessment {
  urgency_level: UrgencyLevel | null
  days_until_due: number
  triggered_by: string[]
  recommended_date: string | null
  estimated_cost_usd: number
}

export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'technician' | 'community_reporter'
  phone: string | null
  country: string | null
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface MaintenanceQueueItem {
  water_point_id: string
  name: string
  country: string
  type: WaterPointType
  last_serviced: string | null
  quality_score: number
  status: WaterStatus
  urgency_level: UrgencyLevel
  days_until_due: number
  triggered_by: string[]
  estimated_cost_usd: number
  recommended_date: string | null
}

export const COUNTRY_FLAGS: Record<string, string> = {
  Nigeria: '🇳🇬',
  Ghana: '🇬🇭',
  Senegal: '🇸🇳',
  'South Africa': '🇿🇦',
  Zimbabwe: '🇿🇼',
  Zambia: '🇿🇲',
}

export const CURRENCY_MAP: Record<string, { code: string; rate: number }> = {
  Nigeria: { code: 'NGN', rate: 1600 },
  Ghana: { code: 'GHS', rate: 15.2 },
  Senegal: { code: 'XOF', rate: 620 },
  'South Africa': { code: 'ZAR', rate: 18.5 },
  Zimbabwe: { code: 'ZWL', rate: 360 },
  Zambia: { code: 'ZMW', rate: 26.4 },
}
