import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase 키가 설정돼 있으면 실제 클라이언트, 아니면 null.
// null 이면 data.js 가 자동으로 localStorage 데모 모드로 동작한다.
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null
