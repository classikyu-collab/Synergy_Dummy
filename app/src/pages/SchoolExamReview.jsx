import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { useToast } from '../lib/toast'
import { PageHeader, PageLoading, PageError, EmptyState, SmallButton, PrimaryButton, Input, Select } from '../lib/adminUI'

export default function SchoolExamReview() {
  const showToast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const classFilter = searchParams.get('class') ?? ''
  const [classes, setClasses] = useState([])
  const [attempts, setAttempts] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [reports, setReports] = useState(null)
  const [correcting, setCorrecting] = useState(null)
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [correctExplanation, setCorrectExplanation] = useState('')

  async function reload() {
    const [{ data: classRows }, { data: rows, error: fetchErr }, { data: reportRows }] = await Promise.all([
      supabase.from('classes').select('id, name').order('name'),
      supabase
        .from('school_exam_attempts')
        .select('id, status, submitted_at, students(name, class_id, classes(name)), school_exam_worksheets(grade, unit_name, worksheet_type)')
        .order('submitted_at', { ascending: false }),
      supabase
        .from('school_exam_issue_reports')
        .select('id, question_no, reason, detail, status, created_at, students(name, class_id, classes(name)), school_exam_worksheets(id, grade, unit_name, worksheet_type)')
        .eq('status', '접수')
        .order('created_at', { ascending: false }),
    ])
    setClasses(classRows ?? [])
    if (fetchErr) {
      setError('불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setAttempts(rows ?? [])
    setReports(reportRows ?? [])
  }

  useEffect(() => {
    reload()
  }, [])

  const filteredAttempts = useMemo(() => (attempts ?? []).filter((a) => !classFilter || a.students?.class_id === classFilter), [attempts, classFilter])
  const filteredReports = useMemo(() => (reports ?? []).filter((r) => !classFilter || r.students?.class_id === classFilter), [reports, classFilter])

  async function resolveReport(reportId) {
    const { error: updErr } = await supabase
      .from('school_exam_issue_reports')
      .update({ status: '처리완료', resolved_at: new Date().toISOString() })
      .eq('id', reportId)
    if (updErr) {
      showToast('처리 실패: ' + updErr.message, 'error')
      return
    }
    setCorrecting(null)
    reload()
  }

  function openCorrection(report) {
    if (correcting === report.id) {
      setCorrecting(null)
      return
    }
    setCorrecting(report.id)
    setCorrectAnswer('')
    setCorrectExplanation('')
  }

  async function saveCorrection(report) {
    const payload = {}
    if (correctAnswer.trim()) payload.answer_text = correctAnswer.trim()
    if (correctExplanation.trim()) payload.explanation = correctExplanation.trim()
    if (Object.keys(payload).length === 0) {
      showToast('수정할 정답 또는 해설을 입력해주세요.', 'error')
      return
    }
    const { error: updErr } = await supabase
      .from('school_exam_questions')
      .update(payload)
      .eq('worksheet_id', report.school_exam_worksheets.id)
      .eq('question_no', report.question_no)
    if (updErr) {
      showToast('정답 수정 실패 (관리자 권한이 필요할 수 있습니다): ' + updErr.message, 'error')
      return
    }
    showToast('정답/해설을 수정했습니다.')
    await resolveReport(report.id)
  }

  async function openAttempt(id) {
    if (openId === id) {
      setOpenId(null)
      setDetail(null)
      return
    }
    setOpenId(id)
    const { data, error: fetchErr } = await supabase
      .from('school_exam_attempt_answers')
      .select('id, question_no, is_multiple_choice, submitted_choice, submitted_text, auto_correct, self_correct, teacher_correct, final_correct')
      .eq('attempt_id', id)
      .order('question_no')
    if (fetchErr) {
      setError('문항을 불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setDetail(data)
  }

  async function setTeacherCorrect(answerId, value) {
    const { error: updErr } = await supabase.from('school_exam_attempt_answers').update({ teacher_correct: value }).eq('id', answerId)
    if (updErr) {
      showToast('저장 실패: ' + updErr.message, 'error')
      return
    }
    setDetail((prev) => prev.map((d) => (d.id === answerId ? { ...d, teacher_correct: value } : d)))
  }

  async function finalize(attemptId) {
    if (!confirm('검토를 완료 처리할까요? 이후에도 답안 수정은 가능합니다.')) return
    const { error: rpcErr } = await supabase.rpc('finalize_school_exam_review', { p_attempt_id: attemptId })
    if (rpcErr) {
      showToast('처리 실패: ' + rpcErr.message, 'error')
      return
    }
    setOpenId(null)
    setDetail(null)
    showToast('검토를 완료 처리했습니다.')
    reload()
  }

  return (
    <div>
      <PageHeader
        title="내신 시험지 검토"
        subtitle="담당 반 학생들의 제출 답안과 오류 신고를 확인합니다."
        action={
          <Select value={classFilter} onChange={(e) => setSearchParams(e.target.value ? { class: e.target.value } : {})} style={{ width: 160 }}>
            <option value="">전체 반</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        }
      />

      <PageError>{error}</PageError>

      {filteredReports.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>오류 신고 ({filteredReports.length}건 대기)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredReports.map((r) => (
              <div key={r.id} style={{ border: '1px solid #fdd9a8', borderRadius: 12, padding: 14, background: '#fff7ed' }}>
                <div style={{ fontSize: 13.5, color: T.ink }}>
                  <strong>{r.students?.name}</strong>
                  <span style={{ color: T.inkFaint }}> ({r.students?.classes?.name ?? '반 미배정'})</span> —{' '}
                  {[r.school_exam_worksheets?.grade, r.school_exam_worksheets?.unit_name, r.school_exam_worksheets?.worksheet_type].filter(Boolean).join(' · ')} · {r.question_no}번
                </div>
                <div style={{ fontSize: 13, margin: '6px 0 2px', color: T.ink }}>{r.reason}</div>
                {r.detail && <div style={{ fontSize: 12.5, color: T.inkMuted, margin: '2px 0' }}>{r.detail}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <SmallButton onClick={() => openCorrection(r)}>{correcting === r.id ? '취소' : '정답/해설 수정'}</SmallButton>
                  <SmallButton onClick={() => resolveReport(r.id)}>문제 없음 (처리완료)</SmallButton>
                </div>
                {correcting === r.id && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Input type="text" placeholder="새 정답 (비우면 유지)" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
                    <textarea
                      placeholder="새 해설 (비우면 유지)"
                      rows={2}
                      value={correctExplanation}
                      onChange={(e) => setCorrectExplanation(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 13, borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: 'inherit', resize: 'vertical' }}
                    />
                    <PrimaryButton onClick={() => saveCorrection(r)} style={{ alignSelf: 'flex-start' }}>
                      저장하고 처리완료
                    </PrimaryButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>제출 답안</p>
      {!attempts && !error && <PageLoading />}
      {attempts && filteredAttempts.length === 0 && <EmptyState>제출된 답안이 없습니다.</EmptyState>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredAttempts.map((a) => (
          <div key={a.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => openAttempt(a.id)}>
              <span style={{ fontSize: 13.5, color: T.ink }}>
                <strong>{a.students?.name}</strong>
                <span style={{ color: T.inkFaint }}> ({a.students?.classes?.name ?? '반 미배정'})</span> —{' '}
                {[a.school_exam_worksheets?.grade, a.school_exam_worksheets?.unit_name, a.school_exam_worksheets?.worksheet_type].filter(Boolean).join(' · ')}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: a.status === '검토완료' ? '#186238' : T.inkFaint }}>{a.status}</span>
            </div>

            {openId === a.id && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                {!detail && <p style={{ fontSize: 12.5, color: T.inkFaint }}>불러오는 중...</p>}
                {detail && (
                  <>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: T.inkFaint }}>
                          <th style={{ padding: '4px 6px', fontWeight: 600, fontSize: 12 }}>문항</th>
                          <th style={{ padding: '4px 6px', fontWeight: 600, fontSize: 12 }}>제출 답</th>
                          <th style={{ padding: '4px 6px', fontWeight: 600, fontSize: 12 }}>자가채점</th>
                          <th style={{ padding: '4px 6px', fontWeight: 600, fontSize: 12 }}>강사 확인</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.map((d) => (
                          <tr key={d.id} style={{ borderTop: `1px solid ${T.border}` }}>
                            <td style={{ padding: '6px' }}>
                              {d.question_no}번{d.is_multiple_choice ? ' (객관식)' : ''}
                            </td>
                            <td style={{ padding: '6px' }}>{d.is_multiple_choice ? d.submitted_choice ?? '무응답' : d.submitted_text || '무응답'}</td>
                            <td style={{ padding: '6px' }}>
                              {d.is_multiple_choice ? (d.auto_correct ? 'O (자동)' : 'X (자동)') : d.self_correct == null ? '미채점' : d.self_correct ? 'O' : 'X'}
                            </td>
                            <td style={{ padding: '6px' }}>
                              {d.is_multiple_choice ? (
                                '—'
                              ) : (
                                <span style={{ display: 'flex', gap: 4 }}>
                                  <SmallButton onClick={() => setTeacherCorrect(d.id, true)} style={{ fontWeight: d.teacher_correct === true ? 800 : 500, color: d.teacher_correct === true ? '#186238' : T.inkMuted }}>
                                    O
                                  </SmallButton>
                                  <SmallButton onClick={() => setTeacherCorrect(d.id, false)} style={{ fontWeight: d.teacher_correct === false ? 800 : 500, color: d.teacher_correct === false ? '#a02323' : T.inkMuted }}>
                                    X
                                  </SmallButton>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {a.status !== '검토완료' && (
                      <PrimaryButton onClick={() => finalize(a.id)} style={{ marginTop: 12 }}>
                        검토 완료 처리
                      </PrimaryButton>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
