import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { ModalWrap, ModalTitle, Field, Input, PrimaryButton, GhostButton, InlineError } from '../lib/adminUI'

// "1. 3강 변형문제 2 풀기+채점 (p.25~42)" 형태를 우선순위/이름/페이지로 분리한다.
function parseContentLine(raw) {
  let text = raw.trim()
  let priority = null
  const pm = text.match(/^(\d+)[.)]\s*(.*)$/)
  if (pm && pm[2].trim()) {
    priority = parseInt(pm[1], 10)
    text = pm[2].trim()
  }
  const m = text.match(/^(.*?)\s*\(p\.?\s*([\d~\-,\s]+)\)\s*$/i)
  if (m && m[1].trim()) {
    return { priority, name: m[1].trim(), page: m[2].trim() }
  }
  return { priority, name: text, page: null }
}

// "김민성 = M3A한 1-5" 형태를 학생명 + 내용으로 분리한다.
function parsePersonalLine(raw) {
  const idx = raw.indexOf('=')
  if (idx === -1) return null
  const namePart = raw.slice(0, idx).trim()
  const contentPart = raw.slice(idx + 1).trim()
  if (!namePart || !contentPart) return null
  return { studentName: namePart, ...parseContentLine(contentPart) }
}

// parseContentLine의 역변환: 저장된 항목을 다시 "1. 이름 (p.24)" 줄로 되돌린다.
function formatItemLine(item) {
  let s = item.name
  if (item.page) s += ` (p.${item.page})`
  if (item.priority != null) s = `${item.priority}. ${s}`
  return s
}

export default function HomeworkComposer({ classId, students, initialPostedDate, initialDueDate, onClose, onSaved }) {
  const [postedDate, setPostedDate] = useState(initialPostedDate)
  const [dueDate, setDueDate] = useState(initialDueDate ?? initialPostedDate)
  const [text, setText] = useState('')
  const [personalLabel, setPersonalLabel] = useState('')
  const [personalText, setPersonalText] = useState('')
  const [selected, setSelected] = useState(() => new Set(students.map((s) => s.id)))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingPrev, setLoadingPrev] = useState(false)

  const studentsByName = useMemo(() => new Map(students.map((s) => [s.name, s])), [students])

  async function loadPreviousBatch() {
    if ((text.trim() || personalText.trim()) && !confirm('지금 작성 중인 내용을 지난 숙제 내용으로 덮어쓸까요?')) return
    setLoadingPrev(true)
    setError('')

    const { data: prevDateRows, error: dateErr } = await supabase
      .from('coaching_items')
      .select('posted_date')
      .eq('class_id', classId)
      .eq('item_type', '숙제')
      .is('deleted_at', null)
      .lt('posted_date', postedDate)
      .order('posted_date', { ascending: false })
      .limit(1)
    if (dateErr) {
      setLoadingPrev(false)
      setError('지난 숙제를 불러오지 못했습니다: ' + dateErr.message)
      return
    }
    const prevDate = prevDateRows?.[0]?.posted_date
    if (!prevDate) {
      setLoadingPrev(false)
      setError('불러올 지난 숙제가 없습니다.')
      return
    }

    const { data: its, error: itemErr } = await supabase
      .from('coaching_items')
      .select('id, name, page, priority')
      .eq('class_id', classId)
      .eq('item_type', '숙제')
      .eq('posted_date', prevDate)
      .is('deleted_at', null)
      .order('priority', { ascending: true, nullsFirst: false })
    if (itemErr) {
      setLoadingPrev(false)
      setError('지난 숙제를 불러오지 못했습니다: ' + itemErr.message)
      return
    }

    const itemIds = its.map((i) => i.id)
    const { data: targets } = itemIds.length > 0 ? await supabase.from('coaching_item_targets').select('item_id, students(name)').in('item_id', itemIds) : { data: [] }
    const countByItem = {}
    const nameByItem = {}
    ;(targets ?? []).forEach((t) => {
      countByItem[t.item_id] = (countByItem[t.item_id] ?? 0) + 1
      nameByItem[t.item_id] = t.students?.name
    })

    const commonItems = its.filter((i) => (countByItem[i.id] ?? 0) !== 1)
    const personalItems = its.filter((i) => (countByItem[i.id] ?? 0) === 1)

    setText(commonItems.map(formatItemLine).join('\n'))
    setPersonalText(personalItems.map((i) => `${nameByItem[i.id]} = ${formatItemLine(i)}`).join('\n'))
    setLoadingPrev(false)
  }

  const commonLines = text
    .split('\n')
    .map(parseContentLine)
    .filter((l) => l.name)

  const personalRawLines = personalText.split('\n').map((l) => l.trim()).filter(Boolean)
  const personalParsed = personalRawLines.map(parsePersonalLine).filter(Boolean)
  const unmatchedNames = [...new Set(personalParsed.filter((p) => !studentsByName.has(p.studentName)).map((p) => p.studentName))]

  function toggleStudent(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (commonLines.length === 0 && personalParsed.length === 0) {
      setError('숙제를 한 줄 이상 적어주세요.')
      return
    }
    if (commonLines.length > 0 && selected.size === 0) {
      setError('공통 숙제의 대상 학생을 한 명 이상 선택해주세요.')
      return
    }
    if (unmatchedNames.length > 0) {
      setError('학생을 찾지 못했어요: ' + unmatchedNames.join(', '))
      return
    }
    setSaving(true)

    if (commonLines.length > 0) {
      const rows = commonLines.map((l) => ({
        class_id: classId,
        date: dueDate,
        posted_date: postedDate,
        item_type: '숙제',
        name: l.name,
        page: l.page,
        priority: l.priority,
        target_mode: 'explicit',
        source: '담임입력(웹)',
      }))
      const { data: created, error: insErr } = await supabase.from('coaching_items').insert(rows).select('id')
      if (insErr) {
        setSaving(false)
        setError('등록 실패: ' + insErr.message)
        return
      }
      const targetRows = created.flatMap((c) => [...selected].map((studentId) => ({ item_id: c.id, student_id: studentId })))
      const { error: targetErr } = await supabase.from('coaching_item_targets').insert(targetRows)
      if (targetErr) {
        setSaving(false)
        setError('대상 학생 지정 실패: ' + targetErr.message)
        return
      }
    }

    if (personalParsed.length > 0) {
      const rows = personalParsed.map((l) => ({
        class_id: classId,
        date: dueDate,
        posted_date: postedDate,
        item_type: '숙제',
        name: personalLabel.trim() ? `${personalLabel.trim()} ${l.name}` : l.name,
        page: l.page,
        priority: l.priority,
        target_mode: 'explicit',
        source: '담임입력(웹)',
      }))
      const { data: created, error: insErr } = await supabase.from('coaching_items').insert(rows).select('id')
      if (insErr) {
        setSaving(false)
        setError('개인별 숙제 등록 실패: ' + insErr.message)
        return
      }
      const targetRows = created.map((c, i) => ({ item_id: c.id, student_id: studentsByName.get(personalParsed[i].studentName).id }))
      const { error: targetErr } = await supabase.from('coaching_item_targets').insert(targetRows)
      if (targetErr) {
        setSaving(false)
        setError('개인별 대상 지정 실패: ' + targetErr.message)
        return
      }
    }

    setSaving(false)
    onSaved()
  }

  const textareaStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    fontSize: 13.5,
    lineHeight: 1.7,
    borderRadius: 10,
    border: `1px solid ${T.border}`,
    fontFamily: 'inherit',
    resize: 'vertical',
    color: T.ink,
    background: T.surface,
  }

  return (
    <ModalWrap onClose={onClose} width={540}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <ModalTitle>숙제 게시글 작성</ModalTitle>
        <GhostButton type="button" onClick={loadPreviousBatch} disabled={loadingPrev} style={{ flex: 'none', padding: '7px 12px', fontSize: 12.5 }}>
          {loadingPrev ? '불러오는 중...' : '지난 숙제 불러오기'}
        </GhostButton>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field label="등록일">
              <Input type="date" value={postedDate} onChange={(e) => setPostedDate(e.target.value)} required />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="마감일 (다음 수업)">
              <Input type="date" value={dueDate} min={postedDate} onChange={(e) => setDueDate(e.target.value)} required />
            </Field>
          </div>
        </div>

        <Field label={`공통 숙제 (한 줄에 하나 · "1. 항목명 (p.24)"처럼 앞 번호는 순서, 끝 페이지는 자동 분리돼요)`}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'1. 3강 변형문제 풀기 (p.24)\n2. 단어 20개 암기\n3. Lesson 5 서술형 오답노트 (p.94~98)'}
            rows={5}
            style={textareaStyle}
          />
        </Field>

        {commonLines.length > 0 && (
          <div style={{ margin: '-6px 0 14px', fontSize: 12, color: T.inkFaint }}>
            {commonLines.length}개 항목 — {commonLines.map((l) => l.name).join(' · ')}
          </div>
        )}

        <Field label="공통 숙제 대상 학생">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxHeight: 110, overflowY: 'auto', padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: 8 }}>
            {students.map((s) => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: T.ink, cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleStudent(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        </Field>

        <div style={{ borderTop: `1px solid ${T.border}`, margin: '16px 0 14px' }} />

        <Field label="구분 (선택 — 개인별 숙제 이름 앞에 붙어요, 예: 단어)">
          <Input value={personalLabel} onChange={(e) => setPersonalLabel(e.target.value)} placeholder="단어" />
        </Field>

        <Field label={`개인별 숙제 (학생마다 다를 때만 · "이름 = 내용" 형식, 한 줄에 한 명)`}>
          <textarea
            value={personalText}
            onChange={(e) => setPersonalText(e.target.value)}
            placeholder={'김민성 = M3A한 1-5\n서대녀 = M2B영 11-13\n오릴카 = M2A한 24-26'}
            rows={4}
            style={textareaStyle}
          />
        </Field>

        {personalParsed.length > 0 && unmatchedNames.length === 0 && (
          <div style={{ margin: '-6px 0 14px', fontSize: 12, color: T.inkFaint }}>
            {personalParsed.length}명에게 개인별로 등록됩니다.
          </div>
        )}
        {unmatchedNames.length > 0 && (
          <div style={{ margin: '-6px 0 14px', fontSize: 12, color: '#a02323' }}>학생 명단에서 찾지 못했어요: {unmatchedNames.join(', ')}</div>
        )}

        <InlineError>{error}</InlineError>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
            취소
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving} style={{ flex: 1 }}>
            {saving ? '게시 중...' : '게시하기'}
          </PrimaryButton>
        </div>
      </form>
    </ModalWrap>
  )
}
