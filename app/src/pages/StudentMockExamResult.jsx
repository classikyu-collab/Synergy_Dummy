import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'
import { QUESTION_TYPE_ORDER } from '../lib/mockExam'
import StudentMenuDrawer, { StudentMenuButton, useStudentMenu } from './StudentMenu'
import PinGate from './PinGate'

export default function StudentMockExamResult() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo="/student" backLabel="처음으로">
      {() => <StudentMockExamResultContent />}
    </PinGate>
  )
}

function StudentMockExamResultContent() {
  const { classId, studentId, attemptId } = useParams()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const { open, openMenu, closeMenu } = useStudentMenu()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: rpcErr } = await supabase.rpc('get_mock_exam_attempt', { p_attempt_id: attemptId })
      if (cancelled) return
      if (rpcErr || !data) {
        setError('결과를 불러오지 못했습니다.')
        return
      }
      setResult(data)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [attemptId])

  const base = `/student/${classId}/${studentId}`

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Link to={`${base}/mock-exam`}>← 시험 목록</Link>
      </div>
    )
  }
  if (!result) {
    return <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>불러오는 중...</div>
  }

  const pct = result.max_score ? Math.round((result.total_score / result.max_score) * 100) : 0
  const counted = (result.question_results ?? []).filter((r) => r.counted)
  const correctCount = counted.filter((r) => r.isCorrect).length
  const typeEntries = Object.entries(result.type_stats ?? {}).sort(
    (a, b) => QUESTION_TYPE_ORDER.indexOf(a[0]) - QUESTION_TYPE_ORDER.indexOf(b[0]),
  )

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
          to={`${base}/mock-exam`}
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
          시험 목록
        </Link>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '38px 60px 14px 46px', lineHeight: 1.35 }}>{result.exam_title}</p>

        <div style={{ background: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              flexShrink: 0,
              background: `conic-gradient(#fff calc(${pct} * 1%), rgba(255,255,255,0.25) 0)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: THEME.primaryDark,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {pct}%
            </div>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
              {result.total_score}
              <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}> / {result.max_score}점</span>
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>
              {counted.length}문항 중 {correctCount}문항 정답
              {result.national_average != null ? ` · 전국평균 ${result.national_average}점` : ''}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 32px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>유형별 정답률</p>
        <div style={{ background: '#fff', borderRadius: 16, padding: '6px 14px', marginBottom: 22, boxShadow: '0 4px 14px -8px rgba(30,30,80,0.18)' }}>
          {typeEntries.map(([type, stat], i) => {
            const rate = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0
            return (
              <div key={type} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid #eceef7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{type}</span>
                  <span style={{ fontSize: 12.5, color: THEME.inkMuted }}>
                    {stat.correct}/{stat.total} · {rate}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: '#eceef7', overflow: 'hidden' }}>
                  <div style={{ width: `${rate}%`, height: '100%', background: rate >= 70 ? THEME.primary : THEME.examBorder }} />
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>문항별 채점</p>
        <div style={{ background: '#fff', borderRadius: 16, padding: 12, boxShadow: '0 4px 14px -8px rgba(30,30,80,0.18)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {(result.question_results ?? []).map((r) => {
              const dimmed = !r.counted
              return (
                <div
                  key={r.q}
                  title={r.type}
                  style={{
                    border: `1px solid ${dimmed ? '#eceef7' : r.isCorrect ? '#d9f2e3' : '#fbdcdc'}`,
                    background: dimmed ? '#f8f9fc' : r.isCorrect ? '#f2fbf6' : '#fef5f5',
                    borderRadius: 10,
                    padding: '6px 4px',
                    textAlign: 'center',
                    opacity: dimmed ? 0.55 : 1,
                  }}
                >
                  <div style={{ fontSize: 10, color: THEME.inkMuted }}>{r.q}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: dimmed ? THEME.inkMuted : r.isCorrect ? '#186238' : '#a02323' }}>
                    {dimmed ? '–' : r.isCorrect ? 'O' : 'X'}
                  </div>
                  {!dimmed && !r.isCorrect && (
                    <div style={{ fontSize: 9.5, color: THEME.inkMuted, lineHeight: 1.2 }}>
                      {r.studentAnswer ?? '무응답'}→{r.correctAnswer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <StudentMenuDrawer open={open} onClose={closeMenu} classId={classId} studentId={studentId} active="mock-exam" theme={THEME} />
    </div>
  )
}
