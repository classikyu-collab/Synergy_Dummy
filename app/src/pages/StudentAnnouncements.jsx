import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'
import StudentMenuDrawer, { StudentMenuButton, useStudentMenu } from './StudentMenu'
import PinGate from './PinGate'
import { loadSeenIds, markAnnouncementSeen } from '../lib/announcementSeen'

export default function StudentAnnouncements() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo="/student" backLabel="처음으로">
      {() => <StudentAnnouncementsContent />}
    </PinGate>
  )
}

function StudentAnnouncementsContent() {
  const { classId, studentId } = useParams()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [seenIds, setSeenIds] = useState(() => loadSeenIds(studentId))
  const { open, openMenu, closeMenu } = useStudentMenu()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: rpcErr } = await supabase.rpc('list_student_announcements', { p_student_id: studentId })
      if (cancelled) return
      if (rpcErr) {
        setError('공지사항을 불러오지 못했습니다: ' + rpcErr.message)
        return
      }
      setItems(data ?? [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const base = `/student/${classId}/${studentId}`

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
        <StudentMenuButton onClick={openMenu} />
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
        <p style={{ fontSize: 19, fontWeight: 700, margin: '38px 40px 4px 46px', lineHeight: 1.4 }}>공지사항</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: '0 40px 0 46px' }}>학원에서 전하는 소식을 확인해보세요.</p>
      </div>

      <div style={{ padding: '18px 16px 32px' }}>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        {!items && !error && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>불러오는 중...</p>}
        {items && items.length === 0 && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>등록된 공지사항이 없습니다.</p>}

        {items && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((a) => {
              const isOpen = openId === a.id
              const isNew = !seenIds.has(a.id)
              return (
                <div
                  key={a.id}
                  onClick={() => {
                    setOpenId(isOpen ? null : a.id)
                    if (isNew) setSeenIds(markAnnouncementSeen(studentId, a.id))
                  }}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: '14px 16px',
                    boxShadow: '0 4px 14px -8px rgba(30,30,80,0.18)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      {isNew && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: '#fff',
                            background: THEME.examBorder ?? '#e2544d',
                            borderRadius: 6,
                            padding: '2px 6px',
                            flexShrink: 0,
                          }}
                        >
                          NEW
                        </span>
                      )}
                      <p style={{ fontSize: 14.5, fontWeight: 700, margin: 0, lineHeight: 1.35 }}>{a.title}</p>
                    </div>
                    <span style={{ fontSize: 11, color: THEME.inkMuted, flexShrink: 0, marginTop: 2 }}>
                      {new Date(a.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {isOpen && (
                    <p style={{ fontSize: 13, color: THEME.ink, margin: '10px 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{a.content}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <StudentMenuDrawer open={open} onClose={closeMenu} classId={classId} studentId={studentId} active="announcements" theme={THEME} />
    </div>
  )
}
