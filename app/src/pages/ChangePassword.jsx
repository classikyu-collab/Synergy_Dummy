import { useState } from 'react'
import { supabase, translateAuthError } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { Field, Input, PrimaryButton, GhostButton, InlineError } from '../lib/adminUI'

export default function ChangePassword({ onChanged, onCancel, forced = true }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('비밀번호는 6자리 이상이어야 합니다.')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (password === '1234' || password === '123456') {
      setError('초기/임시 비밀번호는 그대로 사용할 수 없습니다.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(translateAuthError(updateError.message))
      setLoading(false)
      return
    }

    const { error: rpcError } = await supabase.rpc('mark_password_changed')
    setLoading(false)
    if (rpcError) {
      setError('상태 갱신에 실패했습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    onChanged()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontFamily: "'Noto Sans KR', -apple-system, sans-serif" }}>
      <div style={{ width: 340, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 32, boxShadow: '0 8px 30px -12px rgba(30,30,80,0.18)' }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px', color: T.ink }}>비밀번호 변경</h2>
        <p style={{ fontSize: 12.5, color: T.inkMuted, margin: '0 0 22px' }}>{forced ? '최초 로그인입니다. 새 비밀번호로 변경해주세요.' : '새 비밀번호를 입력해주세요.'}</p>
        <form onSubmit={handleSubmit}>
          <Field label="새 비밀번호">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Field label="새 비밀번호 확인">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
          <InlineError>{error}</InlineError>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {!forced && onCancel && (
              <GhostButton type="button" onClick={onCancel} disabled={loading} style={{ flex: 1 }}>
                취소
              </GhostButton>
            )}
            <PrimaryButton type="submit" disabled={loading} style={{ flex: 1, padding: 12, fontSize: 14 }}>
              {loading ? '변경 중...' : '변경하기'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  )
}
