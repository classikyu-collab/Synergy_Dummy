import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const STAFF_EMAIL_DOMAIN = '@synergy.internal'

export function staffIdToEmail(id) {
  return `${id.trim()}${STAFF_EMAIL_DOMAIN}`
}

const AUTH_ERROR_TRANSLATIONS = [
  [/Password should be at least (\d+) characters/i, (m) => `비밀번호는 ${m[1]}자리 이상이어야 합니다.`],
  [/New password should be different from the old password/i, () => '새 비밀번호는 기존 비밀번호와 달라야 합니다.'],
  [/Invalid login credentials/i, () => '아이디 또는 비밀번호가 올바르지 않습니다.'],
  [/Email not confirmed/i, () => '이메일 인증이 완료되지 않았습니다.'],
  [/Auth session missing/i, () => '로그인 세션이 만료되었습니다. 다시 로그인해주세요.'],
]

export function translateAuthError(message) {
  for (const [pattern, translate] of AUTH_ERROR_TRANSLATIONS) {
    const match = message.match(pattern)
    if (match) return translate(match)
  }
  return message
}
