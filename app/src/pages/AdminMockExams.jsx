import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { useToast } from '../lib/toast'
import {
  Th,
  Td,
  Tr,
  StatusBadge,
  Badge,
  SmallButton,
  PrimaryButton,
  GhostButton,
  DangerButton,
  TableCard,
  Field,
  Input,
  Select,
  ModalWrap,
  ModalTitle,
  InlineError,
  PageHeader,
  PageLoading,
  PageError,
  EmptyState,
} from '../lib/adminUI'
import { TOTAL_QUESTIONS, getQuestionType, parseNumberList } from '../lib/mockExam'

const GRADES = ['고1', '고2', '고3']

export default function AdminMockExams() {
  const showToast = useToast()
  const [exams, setExams] = useState(null)
  const [classes, setClasses] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

  async function reload() {
    const { data, error: fetchErr } = await supabase
      .from('mock_exams')
      .select(
        'id, title, grade, year, month, includes_listening, answer_key, points, national_average, audience_type, is_active, created_at, mock_exam_attempts(count), mock_exam_classes(class_id, classes(name))',
      )
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    if (fetchErr) {
      setError('시험 목록을 불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setExams(data)
  }

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('id, name').eq('status', '운영중').order('name')
    setClasses(data ?? [])
  }

  useEffect(() => {
    reload()
    loadClasses()
  }, [])

  async function handleDelete(exam) {
    const attemptCount = exam.mock_exam_attempts?.[0]?.count ?? 0
    const warning = attemptCount > 0 ? `\n\n이 시험에는 응시 기록 ${attemptCount}건이 있습니다. 함께 삭제됩니다.` : ''
    if (!confirm(`"${exam.title}" 시험을 삭제할까요?${warning}`)) return
    const { error: dbErr } = await supabase.from('mock_exams').delete().eq('id', exam.id)
    if (dbErr) {
      showToast('삭제 실패: ' + dbErr.message, 'error')
      return
    }
    showToast('시험이 삭제되었습니다.')
    reload()
  }

  return (
    <div>
      <PageHeader
        title="모의고사"
        subtitle="45문항 영어 모의고사를 등록하고 정답·배점을 관리합니다."
        action={<PrimaryButton onClick={() => setCreating(true)}>+ 시험 등록</PrimaryButton>}
      />

      <PageError>{error}</PageError>
      {!exams && !error && <PageLoading />}
      {exams && exams.length === 0 && <EmptyState>등록된 시험이 없습니다.</EmptyState>}

      {exams && exams.length > 0 && (
        <TableCard>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg }}>
                <Th>시험명</Th>
                <Th w={70}>학년</Th>
                <Th w={90}>시행</Th>
                <Th w={70}>듣기</Th>
                <Th w={140}>공개범위</Th>
                <Th w={80}>응시</Th>
                <Th w={80}>상태</Th>
                <th style={{ padding: '12px 20px' }} />
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <Tr key={e.id}>
                  <Td style={{ fontWeight: 700, color: T.ink }}>{e.title}</Td>
                  <Td>{e.grade}</Td>
                  <Td>{e.year && e.month ? `${e.year}년 ${e.month}월` : '-'}</Td>
                  <Td>
                    {e.includes_listening ? (
                      <Badge bg={T.primaryTint} color={T.primaryDark}>
                        포함
                      </Badge>
                    ) : (
                      <span style={{ color: T.inkFaint }}>미포함</span>
                    )}
                  </Td>
                  <Td>
                    {e.audience_type === '전체' ? (
                      <span style={{ color: T.inkMuted }}>전체 공개</span>
                    ) : (
                      <span style={{ color: T.inkMuted }}>
                        반 배정
                        {e.mock_exam_classes?.length > 0 && (
                          <span style={{ color: T.inkFaint }}> · {e.mock_exam_classes.map((c) => c.classes?.name).filter(Boolean).join(', ')}</span>
                        )}
                      </span>
                    )}
                  </Td>
                  <Td>{e.mock_exam_attempts?.[0]?.count ?? 0}명</Td>
                  <Td>
                    <StatusBadge positive={e.is_active}>{e.is_active ? '사용중' : '비공개'}</StatusBadge>
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    <SmallButton onClick={() => setEditing(e)}>수정</SmallButton>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {creating && (
        <ExamModal
          classes={classes}
          onClose={() => setCreating(false)}
          onDone={(msg) => {
            setCreating(false)
            showToast(msg)
            reload()
          }}
        />
      )}

      {editing && (
        <ExamModal
          exam={editing}
          classes={classes}
          onClose={() => setEditing(null)}
          onDone={(msg) => {
            setEditing(null)
            showToast(msg)
            reload()
          }}
          onDelete={() => {
            const target = editing
            setEditing(null)
            handleDelete(target)
          }}
        />
      )}
    </div>
  )
}

const textareaStyle = {
  width: '100%',
  minHeight: 64,
  padding: '9px 12px',
  fontSize: 12.5,
  fontFamily: 'ui-monospace, Menlo, monospace',
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  boxSizing: 'border-box',
  background: T.surface,
  color: T.ink,
  colorScheme: 'light',
  resize: 'vertical',
}

function ExamModal({ exam, classes, onClose, onDone, onDelete }) {
  const [title, setTitle] = useState(exam?.title ?? '')
  const [grade, setGrade] = useState(exam?.grade ?? '고1')
  const [year, setYear] = useState(exam?.year ?? new Date().getFullYear())
  const [month, setMonth] = useState(exam?.month ?? '')
  const [includesListening, setIncludesListening] = useState(exam?.includes_listening ?? true)
  const [nationalAverage, setNationalAverage] = useState(exam?.national_average ?? '')
  const [isActive, setIsActive] = useState(exam?.is_active ?? true)
  const [audienceType, setAudienceType] = useState(exam?.audience_type ?? '전체')
  const [selectedClassIds, setSelectedClassIds] = useState(() => new Set((exam?.mock_exam_classes ?? []).map((c) => c.class_id)))
  const [answerText, setAnswerText] = useState((exam?.answer_key ?? []).join(', '))
  const [pointsText, setPointsText] = useState((exam?.points ?? []).join(', '))
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  function toggleClass(classId) {
    setSelectedClassIds((prev) => {
      const next = new Set(prev)
      if (next.has(classId)) next.delete(classId)
      else next.add(classId)
      return next
    })
  }

  const answerParsed = useMemo(() => parseNumberList(answerText, { min: 1, max: 5 }), [answerText])
  const pointsParsed = useMemo(() => parseNumberList(pointsText, { min: 0, max: 10 }), [pointsText])
  const totalPoints = pointsParsed.values.reduce((sum, p) => sum + p, 0)

  function fillDefaultPoints() {
    setPointsText(Array.from({ length: TOTAL_QUESTIONS }, () => 2).join(', '))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (answerParsed.error) {
      setLocalError('정답: ' + answerParsed.error)
      return
    }
    if (pointsParsed.error) {
      setLocalError('배점: ' + pointsParsed.error)
      return
    }
    if (audienceType === '반' && selectedClassIds.size === 0) {
      setLocalError('반 배정을 선택했으면 최소 한 개 반을 골라주세요.')
      return
    }
    setLocalError('')
    setSubmitting(true)
    const payload = {
      title: title.trim(),
      grade,
      year: year ? Number(year) : null,
      month: month ? Number(month) : null,
      includes_listening: includesListening,
      answer_key: answerParsed.values,
      points: pointsParsed.values,
      national_average: nationalAverage === '' ? null : Number(nationalAverage),
      audience_type: audienceType,
      is_active: isActive,
    }

    let examId = exam?.id
    if (exam) {
      const { error: dbErr } = await supabase.from('mock_exams').update(payload).eq('id', exam.id)
      if (dbErr) {
        setSubmitting(false)
        setLocalError('저장 실패: ' + dbErr.message)
        return
      }
      await supabase.from('mock_exam_classes').delete().eq('exam_id', exam.id)
    } else {
      const { data, error: dbErr } = await supabase.from('mock_exams').insert(payload).select('id').single()
      if (dbErr) {
        setSubmitting(false)
        setLocalError('등록 실패: ' + dbErr.message)
        return
      }
      examId = data.id
    }

    if (audienceType === '반' && selectedClassIds.size > 0) {
      const rows = Array.from(selectedClassIds).map((classId) => ({ exam_id: examId, class_id: classId }))
      const { error: assignErr } = await supabase.from('mock_exam_classes').insert(rows)
      if (assignErr) {
        setSubmitting(false)
        setLocalError('반 배정 저장 실패: ' + assignErr.message)
        return
      }
    }

    setSubmitting(false)
    onDone(exam ? '시험이 수정되었습니다.' : '시험이 등록되었습니다.')
  }

  return (
    <ModalWrap onClose={onClose} width={640}>
      <ModalTitle>{exam ? '시험 수정' : '시험 등록'}</ModalTitle>
      <InlineError>{localError}</InlineError>
      <form onSubmit={handleSubmit}>
        <Field label="시험명">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 2026년 3월 고1 전국연합학력평가" required />
        </Field>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field label="학년">
              <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="연도">
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="월">
              <Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="3" />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="전국평균">
              <Input type="number" step="0.1" value={nationalAverage} onChange={(e) => setNationalAverage(e.target.value)} placeholder="선택" />
            </Field>
          </div>
        </div>

        <Field label="듣기 영역">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.inkMuted, cursor: 'pointer' }}>
            <input type="checkbox" checked={includesListening} onChange={(e) => setIncludesListening(e.target.checked)} />
            듣기(1~17번) 포함 — 체크 해제하면 채점 시 1~17번을 자동 만점 처리하고 유형 통계에서 제외합니다
          </label>
        </Field>

        <Field label={`정답 (${TOTAL_QUESTIONS}개, 쉼표 또는 공백 구분)`}>
          <textarea style={textareaStyle} value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="5, 5, 3, 5, 2, ..." />
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: answerParsed.error ? T.danger.text : T.inkFaint }}>
            {answerParsed.error || `${answerParsed.values.length}개 인식됨`}
          </p>
        </Field>

        <Field label={`배점 (${TOTAL_QUESTIONS}개)`}>
          <textarea style={textareaStyle} value={pointsText} onChange={(e) => setPointsText(e.target.value)} placeholder="2, 2, 2, 3, ..." />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11.5, color: pointsParsed.error ? T.danger.text : T.inkFaint }}>
              {pointsParsed.error || `${pointsParsed.values.length}개 인식됨 · 총점 ${totalPoints}점`}
            </p>
            <GhostButton type="button" onClick={fillDefaultPoints} style={{ fontSize: 11.5, padding: '5px 10px' }}>
              전부 2점으로 채우기
            </GhostButton>
          </div>
        </Field>

        {!answerParsed.error && !pointsParsed.error && (
          <Field label="확인">
            <AnswerPreview answers={answerParsed.values} points={pointsParsed.values} includesListening={includesListening} />
          </Field>
        )}

        <Field label="공개 범위">
          <Select value={audienceType} onChange={(e) => setAudienceType(e.target.value)}>
            <option value="전체">전체 공개 — 모든 재원생에게 노출</option>
            <option value="반">반 배정 — 선택한 반 학생에게만 노출</option>
          </Select>
        </Field>

        {audienceType === '반' && (
          <Field label="대상 반">
            {classes.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12.5, color: T.inkFaint }}>운영중인 반이 없습니다.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 10px', border: `1px solid ${T.border}`, borderRadius: 8, padding: 10, maxHeight: 160, overflowY: 'auto' }}>
                {classes.map((c) => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.inkMuted, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedClassIds.has(c.id)} onChange={() => toggleClass(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </Field>
        )}

        <Field label="상태">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.inkMuted, cursor: 'pointer' }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            사용중 (체크 해제하면 아무에게도 안 보이는 비공개 상태가 됩니다)
          </label>
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
            취소
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? '저장 중...' : exam ? '저장' : '등록'}
          </PrimaryButton>
        </div>

        {exam && (
          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 14 }}>
            <DangerButton type="button" onClick={onDelete}>
              이 시험 삭제
            </DangerButton>
          </div>
        )}
      </form>
    </ModalWrap>
  )
}

function AnswerPreview({ answers, points, includesListening }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 3 }}>
      {answers.map((ans, i) => {
        const q = i + 1
        const isListening = q <= 17
        const dimmed = isListening && !includesListening
        return (
          <div
            key={q}
            title={getQuestionType(q)}
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 5,
              padding: '3px 2px',
              textAlign: 'center',
              background: dimmed ? T.bg : T.surface,
              opacity: dimmed ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 9, color: T.inkFaint }}>{q}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.ink }}>{ans}</div>
            <div style={{ fontSize: 9, color: points[i] >= 3 ? T.danger.text : T.inkFaint }}>{points[i]}점</div>
          </div>
        )
      })}
    </div>
  )
}
