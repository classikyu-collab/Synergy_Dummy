import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function SchoolExamReview() {
  const { classId } = useParams()
  const [className, setClassName] = useState('')
  const [attempts, setAttempts] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [reports, setReports] = useState(null)
  const [correcting, setCorrecting] = useState(null)
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [correctExplanation, setCorrectExplanation] = useState('')

  async function reload() {
    const [{ data: cls }, { data: studentRows }] = await Promise.all([
      supabase.from('classes').select('name').eq('id', classId).single(),
      supabase.from('students').select('id').eq('class_id', classId),
    ])
    setClassName(cls?.name ?? '')
    const studentIds = studentRows?.map((s) => s.id) ?? []
    if (studentIds.length === 0) {
      setAttempts([])
      setReports([])
      return
    }
    const [{ data: rows, error: fetchErr }, { data: reportRows }] = await Promise.all([
      supabase
        .from('school_exam_attempts')
        .select('id, status, submitted_at, students(name), school_exam_worksheets(grade, unit_name, worksheet_type)')
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('school_exam_issue_reports')
        .select('id, question_no, reason, detail, status, created_at, students(name), school_exam_worksheets(id, grade, unit_name, worksheet_type)')
        .in('student_id', studentIds)
        .eq('status', '접수')
        .order('created_at', { ascending: false }),
    ])
    if (fetchErr) {
      setError('불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setAttempts(rows ?? [])
    setReports(reportRows ?? [])
  }

  async function resolveReport(reportId) {
    const { error: updErr } = await supabase
      .from('school_exam_issue_reports')
      .update({ status: '처리완료', resolved_at: new Date().toISOString() })
      .eq('id', reportId)
    if (updErr) {
      alert('처리 실패: ' + updErr.message)
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
      alert('수정할 정답 또는 해설을 입력해주세요.')
      return
    }
    const { error: updErr } = await supabase
      .from('school_exam_questions')
      .update(payload)
      .eq('worksheet_id', report.school_exam_worksheets.id)
      .eq('question_no', report.question_no)
    if (updErr) {
      alert('정답 수정 실패 (관리자 권한이 필요할 수 있습니다): ' + updErr.message)
      return
    }
    await resolveReport(report.id)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId])

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
      alert('저장 실패: ' + updErr.message)
      return
    }
    setDetail((prev) => prev.map((d) => (d.id === answerId ? { ...d, teacher_correct: value } : d)))
  }

  async function finalize(attemptId) {
    if (!confirm('검토를 완료 처리할까요? 이후에도 답안 수정은 가능합니다.')) return
    const { error: rpcErr } = await supabase.rpc('finalize_school_exam_review', { p_attempt_id: attemptId })
    if (rpcErr) {
      alert('처리 실패: ' + rpcErr.message)
      return
    }
    setOpenId(null)
    setDetail(null)
    reload()
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <p>
        <Link to={`/staff/classes/${classId}`}>← {className || '반'} 상세로</Link>
      </p>
      <h2>내신 시험지 검토 — {className}</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {reports && reports.length > 0 && (
        <>
          <h3>오류 신고 ({reports.length}건 대기)</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {reports.map((r) => (
              <li key={r.id} style={{ border: '1px solid #f0975b', borderRadius: 8, padding: 12, marginBottom: 10, background: '#fff7ed' }}>
                <div>
                  <strong>{r.students?.name}</strong> —{' '}
                  {[r.school_exam_worksheets?.grade, r.school_exam_worksheets?.unit_name, r.school_exam_worksheets?.worksheet_type].filter(Boolean).join(' · ')} · {r.question_no}번
                </div>
                <div style={{ fontSize: 13, margin: '4px 0' }}>{r.reason}</div>
                {r.detail && <div style={{ fontSize: 12.5, color: '#666', margin: '4px 0' }}>{r.detail}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button onClick={() => openCorrection(r)}>{correcting === r.id ? '취소' : '정답/해설 수정'}</button>
                  <button onClick={() => resolveReport(r.id)}>문제 없음 (처리완료)</button>
                </div>
                {correcting === r.id && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input type="text" placeholder="새 정답 (비우면 유지)" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
                    <textarea placeholder="새 해설 (비우면 유지)" rows={2} value={correctExplanation} onChange={(e) => setCorrectExplanation(e.target.value)} />
                    <button onClick={() => saveCorrection(r)} style={{ alignSelf: 'flex-start' }}>
                      저장하고 처리완료
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>제출 답안</h3>
      {!attempts && !error && <p>불러오는 중...</p>}
      {attempts && attempts.length === 0 && <p>제출된 답안이 없습니다.</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {attempts?.map((a) => (
          <li key={a.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => openAttempt(a.id)}>
              <span>
                <strong>{a.students?.name}</strong> —{' '}
                {[a.school_exam_worksheets?.grade, a.school_exam_worksheets?.unit_name, a.school_exam_worksheets?.worksheet_type].filter(Boolean).join(' · ')}
              </span>
              <span style={{ fontSize: 12, color: a.status === '검토완료' ? '#186238' : '#888' }}>{a.status}</span>
            </div>

            {openId === a.id && (
              <div style={{ marginTop: 10, borderTop: '1px solid #eee', paddingTop: 10 }}>
                {!detail && <p>불러오는 중...</p>}
                {detail && (
                  <>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#888' }}>
                          <th style={{ padding: '4px 6px' }}>문항</th>
                          <th style={{ padding: '4px 6px' }}>제출 답</th>
                          <th style={{ padding: '4px 6px' }}>자가채점</th>
                          <th style={{ padding: '4px 6px' }}>강사 확인</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.map((d) => (
                          <tr key={d.id} style={{ borderTop: '1px solid #eee' }}>
                            <td style={{ padding: '4px 6px' }}>{d.question_no}번{d.is_multiple_choice ? ' (객관식)' : ''}</td>
                            <td style={{ padding: '4px 6px' }}>{d.is_multiple_choice ? d.submitted_choice ?? '무응답' : d.submitted_text || '무응답'}</td>
                            <td style={{ padding: '4px 6px' }}>
                              {d.is_multiple_choice ? (d.auto_correct ? 'O (자동)' : 'X (자동)') : d.self_correct == null ? '미채점' : d.self_correct ? 'O' : 'X'}
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              {d.is_multiple_choice ? (
                                '—'
                              ) : (
                                <span style={{ display: 'flex', gap: 4 }}>
                                  <button onClick={() => setTeacherCorrect(d.id, true)} style={{ fontWeight: d.teacher_correct === true ? 700 : 400 }}>
                                    O
                                  </button>
                                  <button onClick={() => setTeacherCorrect(d.id, false)} style={{ fontWeight: d.teacher_correct === false ? 700 : 400 }}>
                                    X
                                  </button>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {a.status !== '검토완료' && (
                      <button onClick={() => finalize(a.id)} style={{ marginTop: 10 }}>
                        검토 완료 처리
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
