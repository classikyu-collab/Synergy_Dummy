import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'

export default function StudentNameSelect() {
  const { classId } = useParams()
  const [students, setStudents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: rpcErr } = await supabase.rpc('list_students_in_class', { p_class_id: classId })
      if (cancelled) return
      if (rpcErr) {
        setError('학생 목록을 불러오지 못했습니다: ' + rpcErr.message)
        return
      }
      setStudents(data)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [classId])

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 520,
        margin: '0 auto',
        background: THEME.bg,
        fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
        color: THEME.ink,
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          position: 'relative',
          background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
          color: '#fff',
          padding: '22px 20px 26px',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <Link
          to="/student"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            color: 'rgba(255,255,255,0.85)',
            background: 'rgba(255,255,255,0.16)',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          반 다시 선택
        </Link>
        <p style={{ fontSize: 19, fontWeight: 700, margin: '0 40px 4px 0', lineHeight: 1.4 }}>이름을 선택하세요</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: 0 }}>본인 이름을 찾아 눌러주세요.</p>
      </div>

      <div style={{ padding: '18px 16px 28px' }}>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        {!students && !error && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>불러오는 중...</p>}
        {students && students.length === 0 && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>재원 중인 학생이 없습니다.</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {students?.map((s) => (
            <Link
              key={s.id}
              to={`/student/${classId}/${s.id}`}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '18px 10px',
                textAlign: 'center',
                fontSize: 15,
                fontWeight: 700,
                color: THEME.ink,
                boxShadow: '0 4px 14px -10px rgba(30,30,80,0.2)',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
