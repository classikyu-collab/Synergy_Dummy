import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { todayStr } from '../lib/statusColors'
import { PARENT_THEME as THEME } from '../lib/theme'
import ParentMenuDrawer, { ParentMenuButton, useParentMenu } from './ParentMenu'
import ParentPinGate from './ParentPinGate'

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export default function ParentHomework() {
  const { studentId } = useParams()
  const [verifiedPin, setVerifiedPin] = useState(null)

  if (!verifiedPin) {
    return <ParentPinGate studentId={studentId} onVerified={setVerifiedPin} />
  }
  return <ParentHomeworkContent pin={verifiedPin} />
}

function ParentHomeworkContent({ pin }) {
  const { studentId } = useParams()
  const [items, setItems] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [error, setError] = useState('')
  const { open, openMenu, closeMenu } = useParentMenu()

  useEffect(() => {
    let cancelled = false
    supabase
      .rpc('get_parent_homework_board', { p_student_id: studentId, p_pin: pin })
      .then(({ data, error: rpcErr }) => {
        if (cancelled) return
        if (rpcErr) {
          setError('불러오지 못했습니다: ' + rpcErr.message)
          return
        }
        const rows = data ?? []
        setItems(rows)

        const today = todayStr()
        const dates = [...new Set(rows.map((it) => it.posted_date))].sort((a, b) => (a < b ? 1 : -1))
        const defaultDate = dates.find((d) => d < today) ?? dates[0] ?? null
        setSelectedDate(defaultDate)
      })
    return () => {
      cancelled = true
    }
  }, [studentId, pin])

  const availableDates = useMemo(() => [...new Set((items ?? []).map((it) => it.posted_date))].sort((a, b) => (a < b ? 1 : -1)), [items])

  const base = `/parent/${studentId}`
  const itemsForDate = (items ?? []).filter((it) => it.posted_date === selectedDate)

  return (
    <div style={{ position: 'relative', contain: 'layout', width: '100%', maxWidth: 520, margin: '0 auto', background: THEME.bg, fontFamily: "'Noto Sans KR', -apple-system, sans-serif", color: THEME.ink, minHeight: '100vh' }}>
      <div
        style={{
          position: 'relative',
          background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
          color: '#fff',
          padding: '22px 20px 26px',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <ParentMenuButton onClick={openMenu} />
        <Link
          to={base}
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
          홈으로
        </Link>
        <p style={{ fontSize: 19, fontWeight: 700, margin: '38px 20px 4px 46px', lineHeight: 1.4 }}>숙제 보기</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: '0 20px 0 46px' }}>선생님이 올린 날짜별로 숙제를 확인할 수 있어요.</p>
      </div>

      <div style={{ padding: '18px 16px 32px' }}>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        {!items && !error && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>불러오는 중...</p>}

        {items && availableDates.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <select
              value={selectedDate ?? ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 12,
                border: `1px solid ${THEME.border}`,
                background: '#fff',
                color: THEME.ink,
                colorScheme: 'light',
              }}
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {formatDateLabel(d)} 등록
                </option>
              ))}
            </select>
          </div>
        )}

        {items && availableDates.length === 0 && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>등록된 숙제가 없어요.</p>}

        {itemsForDate.length > 0 && (
          <>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: THEME.inkMuted, margin: '-8px 0 14px 2px' }}>{formatShortDate(itemsForDate[0].due_date)}까지 해야 해요</p>
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '4px 14px',
                borderLeft: `4px solid ${THEME.primary}`,
                boxShadow: '0 4px 14px -8px rgba(43,38,33,0.18)',
              }}
            >
              {itemsForDate.map((it, i) => (
                <div key={it.item_id} style={{ padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${THEME.border}` }}>
                  <p style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.35, margin: 0 }}>
                    {it.name}
                    {it.page ? ` (p.${it.page})` : ''}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ParentMenuDrawer open={open} onClose={closeMenu} studentId={studentId} active="homework" theme={THEME} />
    </div>
  )
}
