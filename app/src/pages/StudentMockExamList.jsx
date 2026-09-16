import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'
import StudentMenuDrawer, { StudentMenuButton, useStudentMenu } from './StudentMenu'
import PinGate from './PinGate'

export default function StudentMockExamList() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo={`/student`} backLabel="처음으로">
      {() => <StudentMockExamListContent />}
    </PinGate>
  )
}

function StudentMockExamListContent() {
  const { classId, studentId } = useParams()
  const [exams, setExams] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [error, setError] = useState('')
  const { open, openMenu, closeMenu } = useStudentMenu()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: examRows, error: examErr }, { data: attemptRows }] = await Promise.all([
        supabase.rpc('list_active_mock_exams', { p_student_id: studentId }),
        supabase.rpc('list_student_mock_exam_attempts', { p_student_id: studentId }),
      ])
      if (cancelled) return
      if (examErr) {
        setError('시험 목록을 불러오지 못했습니다: ' + examErr.message)
        return
      }
      setExams(examRows ?? [])
      setAttempts(attemptRows ?? [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const base = `/student/${classId}/${studentId}`

  return (
    <div
      style={{
        position: 'relative',
        contain: 'layout',
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
          돌아가기
        </Link>
        <p style={{ fontSize: 19, fontWeight: 700, margin: '38px 40px 4px 46px', lineHeight: 1.4 }}>모의고사</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: '0 0 0 46px' }}>답안을 입력하면 바로 채점됩니다.</p>
      </div>

      <div style={{ padding: '18px 16px 32px' }}>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        {!exams && !error && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>불러오는 중...</p>}

        {exams && exams.length === 0 && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>현재 응시할 수 있는 시험이 없습니다.</p>}

        {exams && exams.length > 0 && (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>응시할 시험</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
              {exams.map((e) => (
                <Link
                  key={e.id}
                  to={`${base}/mock-exam/${e.id}`}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: '14px 16px',
                    boxShadow: '0 4px 14px -8px rgba(30,30,80,0.18)',
                    display: 'block',
                  }}
                >
                  <p style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.35 }}>{e.title}</p>
                  <p style={{ fontSize: 12, color: THEME.inkMuted, margin: 0 }}>
                    {e.grade}
                    {e.year && e.month ? ` · ${e.year}년 ${e.month}월` : ''}
                    {e.includes_listening ? ' · 듣기 포함' : ' · 듣기 미포함'}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}

        {attempts.length > 0 && (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>내 응시 기록</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attempts.map((a) => (
                <Link
                  key={a.attempt_id}
                  to={`${base}/mock-exam/result/${a.attempt_id}`}
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
                  <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, minWidth: 0 }}>{a.title}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: THEME.primaryDark, flexShrink: 0 }}>
                    {a.total_score}
                    <span style={{ fontSize: 11, fontWeight: 500, color: THEME.inkMuted }}>/{a.max_score}</span>
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <StudentMenuDrawer open={open} onClose={closeMenu} classId={classId} studentId={studentId} active="mock-exam" theme={THEME} />
    </div>
  )
}
