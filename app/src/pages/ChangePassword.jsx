import { useState } from 'react'
import { supabase, translateAuthError } from '../lib/supabaseClient'

export default function ChangePassword({ onChanged }) {
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
    if (password === '1234') {
      setError('초기 비밀번호(1234)는 그대로 사용할 수 없습니다.')
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
    <div style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>비밀번호 변경</h2>
      <p>최초 로그인입니다. 새 비밀번호로 변경해주세요.</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>새 비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>새 비밀번호 확인</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? '변경 중...' : '변경하기'}
        </button>
      </form>
    </div>
  )
}
