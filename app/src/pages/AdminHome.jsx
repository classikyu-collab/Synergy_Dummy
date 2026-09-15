import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ROLE_LABEL = { coach: '코칭쌤', homeroom_teacher: '담임강사', admin: '시스템관리자' }

export default function AdminHome({ admin, onLoggedOut }) {
  const [teachers, setTeachers] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: fetchErr } = await supabase
        .from('teachers')
        .select('id, legacy_id, name, role, status, is_master, must_change_password')
        .order('legacy_id')
      if (cancelled) return
      if (fetchErr) {
        setError('직원 목록을 불러오지 못했습니다: ' + fetchErr.message)
        return
      }
      setTeachers(data)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    onLoggedOut()
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>관리자 — {admin.name}님</h2>
        <button onClick={handleLogout} style={{ padding: '6px 10px' }}>
          로그아웃
        </button>
      </div>

      <h3>직원 계정 목록</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!teachers && !error && <p>불러오는 중...</p>}

      {teachers && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #888' }}>
              <th style={{ padding: 6 }}>아이디</th>
              <th style={{ padding: 6 }}>이름</th>
              <th style={{ padding: 6 }}>역할</th>
              <th style={{ padding: 6 }}>상태</th>
              <th style={{ padding: 6 }}>마스터</th>
              <th style={{ padding: 6 }}>비밀번호 변경 필요</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 6 }}>{t.legacy_id}</td>
                <td style={{ padding: 6 }}>{t.name}</td>
                <td style={{ padding: 6 }}>{ROLE_LABEL[t.role] ?? t.role}</td>
                <td style={{ padding: 6 }}>{t.status}</td>
                <td style={{ padding: 6 }}>{t.is_master ? 'Y' : ''}</td>
                <td style={{ padding: 6 }}>{t.must_change_password ? '예' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ color: '#888', fontSize: 13, marginTop: 12 }}>
        비밀번호 초기화 등 계정 조작 기능은 다음 단계에서 추가될 예정입니다.
      </p>
    </div>
  )
}
