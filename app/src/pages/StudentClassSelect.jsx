import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'

export default function StudentClassSelect() {
  const [classes, setClasses] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: rpcErr } = await supabase.rpc('list_active_classes')
      if (cancelled) return
      if (rpcErr) {
        setError('반 목록을 불러오지 못했습니다: ' + rpcErr.message)
        return
      }
      setClasses(data)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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
          background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
          color: '#fff',
          padding: '22px 20px 26px',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <p style={{ fontSize: 19, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.4 }}>반을 선택하세요</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: 0 }}>내가 속한 반을 눌러주세요.</p>
      </div>

      <div style={{ padding: '18px 16px 28px' }}>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        {!classes && !error && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>불러오는 중...</p>}
        {classes && classes.length === 0 && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>운영 중인 반이 없습니다.</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {classes?.map((c) => (
            <Link
              key={c.id}
              to={`/student/${c.id}`}
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
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
