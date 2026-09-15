import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AdminStudents from './AdminStudents'

const ROLE_LABEL = { coach: '코칭쌤', homeroom_teacher: '담임강사', admin: '시스템관리자' }

export default function AdminHome({ admin, onLoggedOut, onChangePassword }) {
  const [tab, setTab] = useState('teachers')
  const [teachers, setTeachers] = useState(null)
  const [error, setError] = useState('')
  const [resettingId, setResettingId] = useState(null)
  const [message, setMessage] = useState('')

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

  async function handleReset(teacher) {
    if (!confirm(`${teacher.name}(${teacher.legacy_id}) 계정 비밀번호를 123456으로 초기화할까요?`)) return
    setResettingId(teacher.id)
    setMessage('')
    setError('')
    const { data, error: fnErr } = await supabase.functions.invoke('admin-reset-password', {
      body: { teacherId: teacher.id },
    })
    setResettingId(null)
    if (fnErr || data?.error) {
      setError('초기화 실패: ' + (data?.error ?? fnErr.message))
      return
    }
    setMessage(`${teacher.name}(${teacher.legacy_id}) 비밀번호가 123456으로 초기화되었습니다.`)
    setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? { ...t, must_change_password: true } : t)))
  }

  return (
    <div style={{ maxWidth: 760, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>관리자 — {admin.name}님</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onChangePassword} style={{ padding: '6px 10px' }}>
            비밀번호 변경
          </button>
          <button onClick={handleLogout} style={{ padding: '6px 10px' }}>
            로그아웃
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <button
          onClick={() => setTab('teachers')}
          style={{ fontWeight: tab === 'teachers' ? 700 : 400, padding: '6px 10px' }}
        >
          직원 계정
        </button>
        <button
          onClick={() => setTab('students')}
          style={{ fontWeight: tab === 'students' ? 700 : 400, padding: '6px 10px' }}
        >
          학생 통합 현황
        </button>
      </div>

      {tab === 'students' && <AdminStudents />}

      {tab === 'teachers' && (
        <>
      <h3>직원 계정 목록</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
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
              <th style={{ padding: 6 }}></th>
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
                <td style={{ padding: 6 }}>
                  <button
                    onClick={() => handleReset(t)}
                    disabled={resettingId === t.id}
                    style={{ fontSize: 12 }}
                  >
                    {resettingId === t.id ? '처리 중...' : '비밀번호 초기화'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
        </>
      )}
    </div>
  )
}
