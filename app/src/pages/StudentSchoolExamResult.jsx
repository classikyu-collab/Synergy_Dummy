import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'
import StudentMenuDrawer, { StudentMenuButton, useStudentMenu } from './StudentMenu'
import PinGate from './PinGate'

export default function StudentSchoolExamResult() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo="/student" backLabel="처음으로">
      {(pin) => <StudentSchoolExamResultContent pin={pin} />}
    </PinGate>
  )
}

function StudentSchoolExamResultContent({ pin }) {
  const { classId, studentId, attemptId } = useParams()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [savingQ, setSavingQ] = useState(null)
  const [reportingQ, setReportingQ] = useState(null)
  const [reportReason, setReportReason] = useState('정답이 틀린 것 같아요')
  const [reportDetail, setReportDetail] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportedQs, setReportedQs] = useState(() => new Set())
  const { open, openMenu, closeMenu } = useStudentMenu()

  async function load() {
    const { data, error: rpcErr } = await supabase.rpc('get_school_exam_attempt', { p_student_id: studentId, p_pin: pin, p_attempt_id: attemptId })
    if (rpcErr || !data) {
      setError('결과를 불러오지 못했습니다.')
      return
    }
    setResult(data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId])

  async function markSelf(qno, isCorrect) {
    setSavingQ(qno)
    const { error: rpcErr } = await supabase.rpc('set_school_exam_self_check', {
      p_student_id: studentId,
      p_pin: pin,
      p_attempt_id: attemptId,
      p_question_no: qno,
      p_is_correct: isCorrect,
    })
    setSavingQ(null)
    if (rpcErr) {
      alert('저장에 실패했습니다: ' + rpcErr.message)
      return
    }
    await load()
  }

  function openReport(qno) {
    setReportingQ(reportingQ === qno ? null : qno)
    setReportReason('정답이 틀린 것 같아요')
    setReportDetail('')
  }

  async function submitReport(qno) {
    setReportSubmitting(true)
    const { error: rpcErr } = await supabase.rpc('submit_school_exam_issue_report', {
      p_student_id: studentId,
      p_pin: pin,
      p_worksheet_id: result.worksheet_id,
      p_question_no: qno,
      p_attempt_id: attemptId,
      p_reason: reportReason,
      p_detail: reportDetail,
    })
    setReportSubmitting(false)
    if (rpcErr) {
      alert('신고 접수에 실패했습니다: ' + rpcErr.message)
      return
    }
    setReportingQ(null)
    setReportedQs((prev) => new Set(prev).add(qno))
  }

  const base = `/student/${classId}/${studentId}`

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Link to={`${base}/school-exam`}>← 시험지 목록</Link>
      </div>
    )
  }
  if (!result) {
    return <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>불러오는 중...</div>
  }

  const questions = result.questions ?? []
  const pendingSelfCheck = questions.filter((q) => !q.is_multiple_choice && q.self_correct == null && q.teacher_correct == null).length
  const correctCount = questions.filter((q) => q.final_correct).length
  const gradedCount = questions.filter((q) => q.final_correct != null).length

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
          to={`${base}/school-exam`}
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
          시험지 목록
        </Link>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '38px 60px 6px 46px', lineHeight: 1.35 }}>{result.worksheet_title}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '0 20px 0 46px' }}>
          {result.status === '검토완료' ? `강사 검토 완료 · ${correctCount}/${questions.length}문항 정답` : `자가채점 중 · ${correctCount}/${gradedCount || questions.length}문항 정답`}
          {pendingSelfCheck > 0 && result.status !== '검토완료' && ` · 자가채점 ${pendingSelfCheck}문항 남음`}
        </p>
      </div>

      <div style={{ padding: '18px 16px 32px' }}>
        {result.status !== '검토완료' && pendingSelfCheck > 0 && (
          <div style={{ background: '#fff7ed', border: '1px solid #fdd9a8', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: '#92600a' }}>
            서술형/영작 문항은 정답·해설을 보고 직접 O/X를 눌러 자가채점해주세요. 이후 강사님이 한번 더 확인합니다.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.map((q) => {
            const dimmed = q.final_correct == null
            const isMC = q.is_multiple_choice
            return (
              <div
                key={q.question_no}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: '12px 14px',
                  boxShadow: '0 4px 14px -10px rgba(30,30,80,0.16)',
                  border: dimmed ? '1px solid #eceef7' : `1px solid ${q.final_correct ? '#d9f2e3' : '#fbdcdc'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{q.question_no}번</span>
                    <span style={{ fontSize: 11, color: THEME.inkMuted }}>{q.question_type}</span>
                  </div>
                  {!dimmed && (
                    <span style={{ fontSize: 14, fontWeight: 800, color: q.final_correct ? '#186238' : '#a02323' }}>{q.final_correct ? 'O' : 'X'}</span>
                  )}
                </div>

                <p style={{ fontSize: 12.5, color: THEME.inkMuted, margin: '0 0 4px' }}>
                  내 답: {isMC ? q.submitted_choice ?? '무응답' : q.submitted_text || '무응답'}
                </p>
                <p style={{ fontSize: 12.5, color: THEME.ink, margin: '0 0 4px', fontWeight: 600 }}>정답: {q.answer_text}</p>
                {q.explanation && <p style={{ fontSize: 12, color: THEME.inkMuted, margin: '0 0 8px', lineHeight: 1.5 }}>{q.explanation}</p>}

                {!isMC && q.teacher_correct == null && result.status !== '검토완료' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button
                      type="button"
                      disabled={savingQ === q.question_no}
                      onClick={() => markSelf(q.question_no, true)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 10,
                        border: `1.5px solid ${q.self_correct === true ? '#186238' : '#d9f2e3'}`,
                        background: q.self_correct === true ? '#eafbf1' : '#fff',
                        color: '#186238',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      O 맞음
                    </button>
                    <button
                      type="button"
                      disabled={savingQ === q.question_no}
                      onClick={() => markSelf(q.question_no, false)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 10,
                        border: `1.5px solid ${q.self_correct === false ? '#a02323' : '#fbdcdc'}`,
                        background: q.self_correct === false ? '#fef5f5' : '#fff',
                        color: '#a02323',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      X 틀림
                    </button>
                  </div>
                )}
                {!isMC && q.teacher_correct != null && (
                  <p style={{ fontSize: 11, color: THEME.primaryDark, margin: '4px 0 0', fontWeight: 600 }}>강사 확인 완료</p>
                )}

                <div style={{ marginTop: 8, borderTop: '1px solid #f2f2f8', paddingTop: 6 }}>
                  {reportedQs.has(q.question_no) ? (
                    <p style={{ fontSize: 11, color: THEME.inkMuted, margin: 0 }}>신고 접수됨 — 강사님이 확인할 예정이에요.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openReport(q.question_no)}
                      style={{ fontSize: 11, color: THEME.inkMuted, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      이 문항 정답/해설이 이상해요
                    </button>
                  )}

                  {reportingQ === q.question_no && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        style={{ fontSize: 12.5, padding: '6px 8px', borderRadius: 8, border: '1px solid #dcdef0', colorScheme: 'light' }}
                      >
                        <option>정답이 틀린 것 같아요</option>
                        <option>해설이 문제 내용과 맞지 않아요</option>
                        <option>기타</option>
                      </select>
                      <textarea
                        value={reportDetail}
                        onChange={(e) => setReportDetail(e.target.value)}
                        placeholder="자세한 내용 (선택)"
                        rows={2}
                        style={{ fontSize: 12.5, padding: '6px 8px', borderRadius: 8, border: '1px solid #dcdef0', fontFamily: 'inherit', resize: 'vertical' }}
                      />
                      <button
                        type="button"
                        disabled={reportSubmitting}
                        onClick={() => submitReport(q.question_no)}
                        style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, color: '#fff', background: THEME.primary, border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
                      >
                        {reportSubmitting ? '접수 중...' : '신고하기'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <StudentMenuDrawer open={open} onClose={closeMenu} classId={classId} studentId={studentId} active="school-exam" theme={THEME} />
    </div>
  )
}
