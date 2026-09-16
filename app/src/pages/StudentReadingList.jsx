import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'
import StudentMenuDrawer, { StudentMenuButton, useStudentMenu } from './StudentMenu'
import PinGate from './PinGate'

export default function StudentReadingList() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo="/student" backLabel="처음으로">
      {() => <StudentReadingListContent />}
    </PinGate>
  )
}

function StudentReadingListContent() {
  const { classId, studentId } = useParams()
  const [passages, setPassages] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [error, setError] = useState('')
  const { open, openMenu, closeMenu } = useStudentMenu()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: pRows, error: pErr }, { data: aRows }] = await Promise.all([
        supabase.rpc('list_reading_passages', { p_student_id: studentId }),
        supabase.rpc('list_student_reading_attempts', { p_student_id: studentId }),
      ])
      if (cancelled) return
      if (pErr) {
        setError('지문 목록을 불러오지 못했습니다: ' + pErr.message)
        return
      }
      setPassages(pRows ?? [])
      setAttempts(aRows ?? [])
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
        <p style={{ fontSize: 19, fontWeight: 700, margin: '38px 40px 4px 46px', lineHeight: 1.4 }}>빠른 해석 녹음실</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: '0 40px 0 46px' }}>지문을 읽고 해석을 녹음해서 제출해보세요.</p>
      </div>

      <div style={{ padding: '18px 16px 32px' }}>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        {!passages && !error && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>불러오는 중...</p>}
        {passages && passages.length === 0 && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>현재 응시할 수 있는 지문이 없습니다.</p>}

        {passages && passages.length > 0 && (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>지문 목록</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
              {passages.map((p) => {
                const exhausted = p.attempts_today >= 6
                return (
                  <Link
                    key={p.id}
                    to={exhausted ? '#' : `${base}/reading/${p.id}`}
                    onClick={(e) => exhausted && e.preventDefault()}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      padding: '14px 16px',
                      boxShadow: '0 4px 14px -8px rgba(30,30,80,0.18)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      opacity: exhausted ? 0.55 : 1,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.35 }}>{p.title}</p>
                      <p style={{ fontSize: 12, color: THEME.inkMuted, margin: 0 }}>
                        {p.word_count}단어 · 권장 {p.recommended_seconds}초
                      </p>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: exhausted ? '#a02323' : THEME.primaryDark, flexShrink: 0 }}>
                      {exhausted ? '오늘 소진' : `오늘 ${p.attempts_today}/6`}
                    </span>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {attempts.length > 0 && (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>내 제출 기록</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attempts.map((a) => (
                <div
                  key={a.attempt_id}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    boxShadow: '0 4px 14px -10px rgba(30,30,80,0.18)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 3px', lineHeight: 1.35 }}>{a.passage_title}</p>
                    <p style={{ fontSize: 11, color: THEME.inkMuted, margin: 0 }}>{a.status === '폐기' ? '폐기됨' : a.duration_sec ? `${a.duration_sec}초 녹음` : ''}</p>
                  </div>
                  {a.score != null ? (
                    <span style={{ fontSize: 15, fontWeight: 800, color: THEME.primaryDark, flexShrink: 0 }}>{a.score}점</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.inkMuted, background: THEME.bg, borderRadius: 999, padding: '4px 10px', flexShrink: 0 }}>
                      {a.status === '폐기' ? '폐기' : '채점 대기'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <StudentMenuDrawer open={open} onClose={closeMenu} classId={classId} studentId={studentId} active="reading" theme={THEME} />
    </div>
  )
}
