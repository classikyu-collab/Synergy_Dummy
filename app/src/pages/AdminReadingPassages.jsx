import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { useToast } from '../lib/toast'
import {
  Th,
  Td,
  Tr,
  StatusBadge,
  SmallButton,
  PrimaryButton,
  GhostButton,
  DangerButton,
  TableCard,
  Field,
  Input,
  ModalWrap,
  ModalTitle,
  InlineError,
  PageHeader,
  PageLoading,
  PageError,
  EmptyState,
} from '../lib/adminUI'

function computeWordCount(body) {
  return (body ?? '').trim().split(/\s+/).filter(Boolean).length
}

// 원본 시스템의 정확한 계산식은 확인되지 않아, 통역 발화 속도를 분당 약 130단어로 가정한 근사치를 쓴다.
function computeRecommendedSeconds(wordCount) {
  if (!wordCount) return 0
  return Math.round((wordCount / 130) * 60)
}

export default function AdminReadingPassages() {
  const showToast = useToast()
  const [passages, setPassages] = useState(null)
  const [classes, setClasses] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [cleaningUp, setCleaningUp] = useState(false)

  async function runCleanup() {
    if (!confirm('진행중/폐기 상태는 3일, 제출완료는 90일이 지난 녹음을 삭제합니다. 계속할까요?')) return
    setCleaningUp(true)
    const { error: rpcErr } = await supabase.rpc('admin_run_reading_retention_cleanup')
    setCleaningUp(false)
    if (rpcErr) {
      showToast('정리 실패: ' + rpcErr.message, 'error')
      return
    }
    showToast('보관기간 지난 녹음을 정리했습니다.')
    reload()
  }

  async function reload() {
    const { data, error: fetchErr } = await supabase
      .from('reading_passages')
      .select('id, title, word_count, recommended_seconds, audience_type, is_active, created_at, reading_attempts(count), reading_passage_classes(class_id, classes(name))')
      .order('created_at', { ascending: false })
    if (fetchErr) {
      setError('지문 목록을 불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setPassages(data)
  }

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('id, name').eq('status', '운영중').order('name')
    setClasses(data ?? [])
  }

  useEffect(() => {
    reload()
    loadClasses()
  }, [])

  async function handleDelete(passage) {
    const attemptCount = passage.reading_attempts?.[0]?.count ?? 0
    const warning = attemptCount > 0 ? `\n\n이 지문에는 녹음 기록 ${attemptCount}건이 있습니다. 함께 삭제됩니다.` : ''
    if (!confirm(`"${passage.title}" 지문을 삭제할까요?${warning}`)) return
    const { error: dbErr } = await supabase.from('reading_passages').delete().eq('id', passage.id)
    if (dbErr) {
      showToast('삭제 실패: ' + dbErr.message, 'error')
      return
    }
    showToast('지문이 삭제되었습니다.')
    reload()
  }

  return (
    <div>
      <PageHeader
        title="빠른 해석 지문"
        subtitle="학생이 소리 내어 읽고 해석을 녹음할 지문을 관리합니다."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostButton onClick={runCleanup} disabled={cleaningUp}>
              {cleaningUp ? '정리 중...' : '보관기간 지난 녹음 정리'}
            </GhostButton>
            <PrimaryButton onClick={() => setCreating(true)}>+ 지문 등록</PrimaryButton>
          </div>
        }
      />

      <PageError>{error}</PageError>
      {!passages && !error && <PageLoading />}
      {passages && passages.length === 0 && <EmptyState>등록된 지문이 없습니다.</EmptyState>}

      {passages && passages.length > 0 && (
        <TableCard>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafaff' }}>
                <Th>제목</Th>
                <Th w={80}>단어수</Th>
                <Th w={100}>권장시간</Th>
                <Th w={160}>공개범위</Th>
                <Th w={80}>녹음</Th>
                <Th w={80}>상태</Th>
                <th style={{ padding: '12px 20px' }} />
              </tr>
            </thead>
            <tbody>
              {passages.map((p) => (
                <Tr key={p.id}>
                  <Td style={{ fontWeight: 700, color: T.ink }}>{p.title}</Td>
                  <Td>{p.word_count ?? '-'}</Td>
                  <Td>{p.recommended_seconds ? `${p.recommended_seconds}초` : '-'}</Td>
                  <Td>
                    {p.audience_type === '전체' ? (
                      <span style={{ color: T.inkMuted }}>전체 공개</span>
                    ) : (
                      <span style={{ color: T.inkMuted }}>
                        반 배정
                        {p.reading_passage_classes?.length > 0 && (
                          <span style={{ color: T.inkFaint }}> · {p.reading_passage_classes.map((c) => c.classes?.name).filter(Boolean).join(', ')}</span>
                        )}
                      </span>
                    )}
                  </Td>
                  <Td>{p.reading_attempts?.[0]?.count ?? 0}건</Td>
                  <Td>
                    <StatusBadge positive={p.is_active}>{p.is_active ? '사용중' : '비공개'}</StatusBadge>
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    <SmallButton onClick={() => setEditing(p)}>수정</SmallButton>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {creating && (
        <PassageModal
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
        <PassageModal
          passage={editing}
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
  minHeight: 160,
  padding: '9px 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  lineHeight: 1.6,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  boxSizing: 'border-box',
  background: '#fff',
  color: T.ink,
  colorScheme: 'light',
  resize: 'vertical',
}

function PassageModal({ passage, classes, onClose, onDone, onDelete }) {
  const [title, setTitle] = useState(passage?.title ?? '')
  const [body, setBody] = useState(passage?.body ?? '')
  const [isActive, setIsActive] = useState(passage?.is_active ?? true)
  const [audienceType, setAudienceType] = useState(passage?.audience_type ?? '전체')
  const [selectedClassIds, setSelectedClassIds] = useState(() => new Set((passage?.reading_passage_classes ?? []).map((c) => c.class_id)))
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')
  const [bodyLoaded, setBodyLoaded] = useState(!!passage === false || !!passage?.body)

  useEffect(() => {
    if (!passage || passage.body) return
    let cancelled = false
    supabase
      .from('reading_passages')
      .select('body')
      .eq('id', passage.id)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) {
          setBody(data.body)
          setBodyLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleClass(classId) {
    setSelectedClassIds((prev) => {
      const next = new Set(prev)
      if (next.has(classId)) next.delete(classId)
      else next.add(classId)
      return next
    })
  }

  const wordCount = useMemo(() => computeWordCount(body), [body])
  const recommendedSeconds = useMemo(() => computeRecommendedSeconds(wordCount), [wordCount])

  async function handleSubmit(e) {
    e.preventDefault()
    if (audienceType === '반' && selectedClassIds.size === 0) {
      setLocalError('반 배정을 선택했으면 최소 한 개 반을 골라주세요.')
      return
    }
    setLocalError('')
    setSubmitting(true)
    const payload = {
      title: title.trim(),
      body: body.trim(),
      word_count: wordCount,
      recommended_seconds: recommendedSeconds,
      audience_type: audienceType,
      is_active: isActive,
    }

    let passageId = passage?.id
    if (passage) {
      const { error: dbErr } = await supabase.from('reading_passages').update(payload).eq('id', passage.id)
      if (dbErr) {
        setSubmitting(false)
        setLocalError('저장 실패: ' + dbErr.message)
        return
      }
      await supabase.from('reading_passage_classes').delete().eq('passage_id', passage.id)
    } else {
      const { data, error: dbErr } = await supabase.from('reading_passages').insert(payload).select('id').single()
      if (dbErr) {
        setSubmitting(false)
        setLocalError('등록 실패: ' + dbErr.message)
        return
      }
      passageId = data.id
    }

    if (audienceType === '반' && selectedClassIds.size > 0) {
      const rows = Array.from(selectedClassIds).map((classId) => ({ passage_id: passageId, class_id: classId }))
      const { error: assignErr } = await supabase.from('reading_passage_classes').insert(rows)
      if (assignErr) {
        setSubmitting(false)
        setLocalError('반 배정 저장 실패: ' + assignErr.message)
        return
      }
    }

    setSubmitting(false)
    onDone(passage ? '지문이 수정되었습니다.' : '지문이 등록되었습니다.')
  }

  return (
    <ModalWrap onClose={onClose} width={640}>
      <ModalTitle>{passage ? '지문 수정' : '지문 등록'}</ModalTitle>
      <InlineError>{localError}</InlineError>
      <form onSubmit={handleSubmit}>
        <Field label="제목">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: Unit 3 - Climate Change" required />
        </Field>

        <Field label={`본문 (${wordCount}단어 · 권장 ${recommendedSeconds}초)`}>
          {!bodyLoaded ? (
            <p style={{ fontSize: 12.5, color: T.inkFaint }}>불러오는 중...</p>
          ) : (
            <textarea value={body} onChange={(e) => setBody(e.target.value)} style={textareaStyle} placeholder="학생이 읽을 영어 지문을 붙여넣으세요" required />
          )}
        </Field>

        <Field label="공개 범위">
          <div style={{ display: 'flex', gap: 14, fontSize: 13, color: T.inkMuted }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" checked={audienceType === '전체'} onChange={() => setAudienceType('전체')} />
              전체 학생
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" checked={audienceType === '반'} onChange={() => setAudienceType('반')} />
              특정 반만
            </label>
          </div>
        </Field>

        {audienceType === '반' && (
          <Field label="대상 반">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxHeight: 140, overflowY: 'auto', padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: 8 }}>
              {classes.map((c) => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.inkMuted, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedClassIds.has(c.id)} onChange={() => toggleClass(c.id)} />
                  {c.name}
                </label>
              ))}
            </div>
          </Field>
        )}

        <Field label="공개 상태">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.inkMuted, cursor: 'pointer' }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            학생에게 공개
          </label>
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          {passage && (
            <DangerButton type="button" onClick={onDelete}>
              삭제
            </DangerButton>
          )}
          <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
            취소
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? '저장 중...' : passage ? '저장' : '등록'}
          </PrimaryButton>
        </div>
      </form>
    </ModalWrap>
  )
}
