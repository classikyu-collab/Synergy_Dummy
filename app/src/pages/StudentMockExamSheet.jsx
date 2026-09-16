import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'
import { TOTAL_QUESTIONS, getQuestionType } from '../lib/mockExam'
import PinGate from './PinGate'

const CHOICES = [1, 2, 3, 4, 5]

export default function StudentMockExamSheet() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo="/student" backLabel="처음으로">
      {(pin) => <StudentMockExamSheetContent pin={pin} />}
    </PinGate>
  )
}

function StudentMockExamSheetContent({ pin }) {
  const { classId, studentId, examId } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [answers, setAnswers] = useState(() => Array(TOTAL_QUESTIONS).fill(null))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: rpcErr } = await supabase.rpc('list_active_mock_exams', { p_student_id: studentId })
      if (cancelled) return
      if (rpcErr) {
        setError('시험 정보를 불러오지 못했습니다: ' + rpcErr.message)
        return
      }
      const found = (data ?? []).find((e) => e.id === examId)
      if (!found) {
        setError('응시할 수 있는 시험이 아닙니다.')
        return
      }
      setExam(found)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [examId])

  // 듣기 미포함 시험은 1~17번을 아예 입력받지 않는다 (채점 시 자동 만점 처리됨)
  const skipListening = exam ? !exam.includes_listening : false
  const activeQuestions = useMemo(
    () => Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i + 1).filter((q) => !(skipListening && q <= 17)),
    [skipListening],
  )
  const answeredCount = activeQuestions.filter((q) => answers[q - 1] != null).length

  function pick(q, choice) {
    setAnswers((prev) => {
      const next = [...prev]
      next[q - 1] = next[q - 1] === choice ? null : choice
      return next
    })
  }

  async function handleSubmit() {
    const unanswered = activeQuestions.length - answeredCount
    const msg = unanswered > 0 ? `아직 ${unanswered}문항을 입력하지 않았습니다. 이대로 제출할까요?` : '답안을 제출할까요? 제출하면 바로 채점됩니다.'
    if (!confirm(msg)) return
    setSubmitting(true)
    setError('')
    const { data, error: rpcErr } = await supabase.rpc('submit_mock_exam', {
      p_student_id: studentId,
      p_pin: pin,
      p_exam_id: examId,
      p_answers: answers,
    })
    setSubmitting(false)
    if (rpcErr) {
      setError('제출에 실패했습니다: ' + rpcErr.message)
      return
    }
    navigate(`/student/${classId}/${studentId}/mock-exam/result/${data.attempt_id}`, { replace: true })
  }

  const base = `/student/${classId}/${studentId}`

  if (error && !exam) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Link to={`${base}/mock-exam`}>← 시험 목록</Link>
      </div>
    )
  }
  if (!exam) {
    return <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>불러오는 중...</div>
  }

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
        paddingBottom: 90,
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
          color: '#fff',
          padding: '20px 20px 22px',
          borderRadius: '0 0 24px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.35 }}>{exam.title}</p>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
          {answeredCount}/{activeQuestions.length} 입력됨
          {skipListening ? ' · 듣기(1~17번) 미포함 시험입니다' : ''}
        </p>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}

        <div style={{ background: '#fff', borderRadius: 16, padding: '4px 12px', boxShadow: '0 4px 14px -8px rgba(30,30,80,0.18)' }}>
          {activeQuestions.map((q, idx) => (
            <div
              key={q}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 0',
                borderTop: idx === 0 ? 'none' : '1px solid #eceef7',
              }}
            >
              <div style={{ width: 46, flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{q}</div>
                <div style={{ fontSize: 9.5, color: THEME.inkMuted, lineHeight: 1.1 }}>{getQuestionType(q)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                {CHOICES.map((c) => {
                  const selected = answers[q - 1] === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => pick(q, c)}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        border: `1.5px solid ${selected ? THEME.primary : '#dcdef0'}`,
                        background: selected ? THEME.primary : '#fff',
                        color: selected ? '#fff' : THEME.inkMuted,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                        colorScheme: 'light',
                      }}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 520,
          margin: '0 auto',
          padding: '12px 16px 16px',
          background: 'linear-gradient(to top, rgba(243,244,251,1) 70%, rgba(243,244,251,0))',
        }}
      >
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 16,
            border: 'none',
            background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
            color: '#fff',
            fontSize: 15.5,
            fontWeight: 800,
            cursor: submitting ? 'default' : 'pointer',
            boxShadow: '0 8px 20px -8px rgba(67,65,201,0.6)',
          }}
        >
          {submitting ? '채점 중...' : '답안 제출하기'}
        </button>
      </div>
    </div>
  )
}
