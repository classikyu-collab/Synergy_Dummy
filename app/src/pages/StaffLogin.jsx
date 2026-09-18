import { useState } from 'react'
import { supabase, staffIdToEmail } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { Field, Input, PrimaryButton, InlineError } from '../lib/adminUI'

export default function StaffLogin({ onLoggedIn }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: staffIdToEmail(id),
      password,
    })

    if (authError) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id, name, role, must_change_password')
      .eq('auth_user_id', data.user.id)
      .single()

    setLoading(false)

    if (teacherError || !teacher) {
      setError('계정 정보를 불러오지 못했습니다.')
      return
    }

    onLoggedIn(teacher)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontFamily: "'Noto Sans KR', -apple-system, sans-serif" }}>
      <div style={{ width: 340, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 32, boxShadow: '0 8px 30px -12px rgba(30,30,80,0.18)' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: T.primaryDark, margin: '0 0 4px' }}>SYNAPSE</p>
        <h2 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 24px', color: T.ink }}>직원 로그인</h2>
        <form onSubmit={handleSubmit}>
          <Field label="아이디">
            <Input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="예: USR-001" required />
          </Field>
          <Field label="비밀번호">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <InlineError>{error}</InlineError>
          <PrimaryButton type="submit" disabled={loading} style={{ width: '100%', marginTop: 4, padding: 12, fontSize: 14 }}>
            {loading ? '로그인 중...' : '로그인'}
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
