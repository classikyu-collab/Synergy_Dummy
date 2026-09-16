import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'
import PinGate from './PinGate'

const CHOICES = [1, 2, 3, 4, 5]

export default function StudentSchoolExamSheet() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo="/student" backLabel="처음으로">
      {(pin) => <StudentSchoolExamSheetContent pin={pin} />}
    </PinGate>
  )
}

function StudentSchoolExamSheetContent({ pin }) {
  const { classId, studentId, worksheetId } = useParams()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: rpcErr } = await supabase.rpc('get_school_exam_worksheet_questions', { p_worksheet_id: worksheetId })
      if (cancelled) return
      if (rpcErr) {
        setError('문항을 불러오지 못했습니다: ' + rpcErr.message)
        return
      }
      setQuestions(data ?? [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [worksheetId])

  function pickChoice(qno, choice) {
    setAnswers((prev) => ({ ...prev, [qno]: prev[qno] === choice ? null : choice }))
  }

  function setText(qno, text) {
    setAnswers((prev) => ({ ...prev, [qno]: text }))
  }

  const answeredCount = (questions ?? []).filter((q) => {
    const v = answers[q.question_no]
    return v != null && v !== ''
  }).length

  async function handleSubmit() {
    const total = questions.length
    const unanswered = total - answeredCount
    const msg = unanswered > 0 ? `아직 ${unanswered}문항을 입력하지 않았습니다. 이대로 제출할까요?` : '답안을 제출할까요? 객관식은 바로 채점되고, 서술형은 다음 화면에서 자가채점합니다.'
    if (!confirm(msg)) return
    setSubmitting(true)
    setError('')
    const payload = questions.map((q) =>
      q.is_multiple_choice ? { question_no: q.question_no, choice: answers[q.question_no] ?? null } : { question_no: q.question_no, text: answers[q.question_no] ?? '' },
    )
    const { data, error: rpcErr } = await supabase.rpc('submit_school_exam_attempt', {
      p_student_id: studentId,
      p_pin: pin,
      p_worksheet_id: worksheetId,
      p_answers: payload,
    })
    setSubmitting(false)
    if (rpcErr) {
      setError('제출에 실패했습니다: ' + rpcErr.message)
      return
    }
    const attemptId = data?.[0]?.attempt_id
    navigate(`/student/${classId}/${studentId}/school-exam/result/${attemptId}`, { replace: true })
  }

  const base = `/student/${classId}/${studentId}`

  if (error && !questions) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Link to={`${base}/school-exam`}>← 시험지 목록</Link>
      </div>
    )
  }
  if (!questions) {
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
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.35 }}>답안 입력</p>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
          {answeredCount}/{questions.length} 입력됨
        </p>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.map((q) => (
            <div
              key={q.question_no}
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: '12px 14px',
                boxShadow: '0 4px 14px -10px rgba(30,30,80,0.16)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{q.question_no}번</span>
                <span style={{ fontSize: 11, color: THEME.inkMuted }}>
                  {q.question_type}
                  {q.sub_answer_count > 1 ? ` · 답 ${q.sub_answer_count}개` : ''}
                </span>
              </div>
              {q.is_multiple_choice ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  {CHOICES.map((c) => {
                    const selected = answers[q.question_no] === c
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => pickChoice(q.question_no, c)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          border: `1.5px solid ${selected ? THEME.primary : '#dcdef0'}`,
                          background: selected ? THEME.primary : '#fff',
                          color: selected ? '#fff' : THEME.inkMuted,
                          fontSize: 13.5,
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
              ) : (
                <textarea
                  value={answers[q.question_no] ?? ''}
                  onChange={(e) => setText(q.question_no, e.target.value)}
                  placeholder={q.sub_answer_count > 1 ? `답 ${q.sub_answer_count}개를 순서대로 적어주세요` : '답안을 입력하세요'}
                  rows={2}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid #dcdef0',
                    borderRadius: 10,
                    padding: '8px 10px',
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    colorScheme: 'light',
                  }}
                />
              )}
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
          {submitting ? '제출 중...' : '답안 제출하기'}
        </button>
      </div>
    </div>
  )
}
