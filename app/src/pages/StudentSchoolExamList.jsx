import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'
import StudentMenuDrawer, { StudentMenuButton, useStudentMenu } from './StudentMenu'
import PinGate from './PinGate'

export default function StudentSchoolExamList() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo="/student" backLabel="처음으로">
      {() => <StudentSchoolExamListContent />}
    </PinGate>
  )
}

function StudentSchoolExamListContent() {
  const { classId, studentId } = useParams()
  const [worksheets, setWorksheets] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [error, setError] = useState('')
  const { open, openMenu, closeMenu } = useStudentMenu()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: wsRows, error: wsErr }, { data: attemptRows }] = await Promise.all([
        supabase.rpc('list_school_exam_worksheets', { p_student_id: studentId }),
        supabase.rpc('list_student_school_exam_attempts', { p_student_id: studentId }),
      ])
      if (cancelled) return
      if (wsErr) {
        setError('시험지 목록을 불러오지 못했습니다: ' + wsErr.message)
        return
      }
      setWorksheets(wsRows ?? [])
      setAttempts(attemptRows ?? [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const base = `/student/${classId}/${studentId}`

  const grouped = {}
  const order = []
  for (const w of worksheets ?? []) {
    const key = `${w.grade} · ${w.unit_name ?? ''}`
    if (!(key in grouped)) {
      grouped[key] = []
      order.push(key)
    }
    grouped[key].push(w)
  }

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
        <p style={{ fontSize: 19, fontWeight: 700, margin: '38px 40px 4px 46px', lineHeight: 1.4 }}>내신 시험지</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: '0 40px 0 46px' }}>풀어본 시험지의 답을 입력하면 채점해드려요.</p>
      </div>

      <div style={{ padding: '18px 16px 32px' }}>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        {!worksheets && !error && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>불러오는 중...</p>}
        {worksheets && worksheets.length === 0 && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>현재 응시할 수 있는 시험지가 없습니다.</p>}

        {order.map((key) => (
          <div key={key} style={{ marginBottom: 22 }}>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>{key}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped[key].map((w) => (
                <Link
                  key={w.id}
                  to={`${base}/school-exam/${w.id}`}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: '12px 14px',
                    boxShadow: '0 4px 14px -8px rgba(30,30,80,0.18)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 3px', lineHeight: 1.35 }}>{w.worksheet_type ?? '시험지'}</p>
                    <p style={{ fontSize: 11.5, color: THEME.inkMuted, margin: 0 }}>
                      {w.publisher_author} · {w.question_count}문항
                    </p>
                  </div>
                  {w.attempted && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.primaryDark, background: THEME.bg, borderRadius: 999, padding: '4px 10px', flexShrink: 0 }}>
                      응시완료
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {attempts.length > 0 && (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>내 응시 기록</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attempts.map((a) => (
                <Link
                  key={a.attempt_id}
                  to={`${base}/school-exam/result/${a.attempt_id}`}
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
                  <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, minWidth: 0 }}>{a.worksheet_title}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: a.status === '검토완료' ? '#186238' : THEME.inkMuted,
                        background: a.status === '검토완료' ? '#eafbf1' : THEME.bg,
                        borderRadius: 999,
                        padding: '3px 8px',
                      }}
                    >
                      {a.status}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: THEME.primaryDark }}>
                      {a.correct_count}
                      <span style={{ fontSize: 11, fontWeight: 500, color: THEME.inkMuted }}>/{a.total_count}</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <StudentMenuDrawer open={open} onClose={closeMenu} classId={classId} studentId={studentId} active="school-exam" theme={THEME} />
    </div>
  )
}
