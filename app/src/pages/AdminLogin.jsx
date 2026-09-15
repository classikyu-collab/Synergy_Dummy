import { useState } from 'react'
import { supabase, staffIdToEmail } from '../lib/supabaseClient'

export default function AdminLogin({ onLoggedIn }) {
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

    if (teacherError || !teacher) {
      setError('계정 정보를 불러오지 못했습니다.')
      setLoading(false)
      return
    }

    if (teacher.role !== 'admin') {
      await supabase.auth.signOut()
      setError('관리자 계정이 아닙니다.')
      setLoading(false)
      return
    }

    setLoading(false)
    onLoggedIn(teacher)
  }

  return (
    <div style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>관리자 로그인</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>아이디</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="예: USR-003"
            required
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
