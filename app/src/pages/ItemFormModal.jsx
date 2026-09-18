import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { ModalWrap, ModalTitle, Field, Input, Select, PrimaryButton, GhostButton, InlineError } from '../lib/adminUI'
import { todayStr as today } from '../lib/statusColors'

export default function ItemFormModal({ classId, students, item, onClose, onSaved, lockType, initialDueDate }) {
  const isEdit = !!item
  const [postedDate, setPostedDate] = useState(item?.posted_date ?? today())
  const [dueDate, setDueDate] = useState(item?.date ?? initialDueDate ?? today())
  const [itemType, setItemType] = useState(item?.item_type ?? lockType ?? '숙제')
  const [name, setName] = useState(item?.name ?? '')
  const [page, setPage] = useState(item?.page ?? '')
  const [selected, setSelected] = useState(() => new Set(isEdit ? [] : students.map((s) => s.id)))
  const [loadingTargets, setLoadingTargets] = useState(isEdit)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    supabase
      .from('coaching_item_targets')
      .select('student_id')
      .eq('item_id', item.id)
      .then(({ data }) => {
        if (cancelled) return
        setSelected(new Set((data ?? []).map((r) => r.student_id)))
        setLoadingTargets(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTypeChange(nextType) {
    setItemType(nextType)
    if (nextType === '시험') setDueDate(postedDate)
  }

  function handlePostedDateChange(value) {
    setPostedDate(value)
    if (itemType === '시험') setDueDate(value)
  }

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
    if (!name.trim()) {
      setError('항목명을 입력해주세요.')
      return
    }
    if (selected.size === 0) {
      setError('대상 학생을 한 명 이상 선택해주세요.')
      return
    }
    const finalDueDate = itemType === '시험' ? postedDate : dueDate
    setSaving(true)

    let itemId = item?.id
    if (isEdit) {
      const { error: updErr } = await supabase
        .from('coaching_items')
        .update({ date: finalDueDate, posted_date: postedDate, item_type: itemType, name: name.trim(), page: page.trim() || null })
        .eq('id', item.id)
      if (updErr) {
        setSaving(false)
        setError('수정 실패: ' + updErr.message)
        return
      }

      const { data: currentTargets } = await supabase.from('coaching_item_targets').select('student_id').eq('item_id', itemId)
      const currentIds = new Set((currentTargets ?? []).map((r) => r.student_id))
      const toAdd = [...selected].filter((id) => !currentIds.has(id))
      const toRemove = [...currentIds].filter((id) => !selected.has(id))

      if (toAdd.length > 0) {
        const { error: addErr } = await supabase.from('coaching_item_targets').insert(toAdd.map((studentId) => ({ item_id: itemId, student_id: studentId })))
        if (addErr) {
          setSaving(false)
          setError('대상 학생 추가 실패: ' + addErr.message)
          return
        }
      }
      if (toRemove.length > 0) {
        const { error: rmErr } = await supabase.from('coaching_item_targets').delete().eq('item_id', itemId).in('student_id', toRemove)
        if (rmErr) {
          setSaving(false)
          setError('대상 학생 제외 실패: ' + rmErr.message)
          return
        }
      }
    } else {
      const { data: created, error: insErr } = await supabase
        .from('coaching_items')
        .insert({
          class_id: classId,
          date: finalDueDate,
          posted_date: postedDate,
          item_type: itemType,
          name: name.trim(),
          page: page.trim() || null,
          target_mode: 'explicit',
          source: '담임입력(웹)',
        })
        .select()
        .single()
      if (insErr) {
        setSaving(false)
        setError('등록 실패: ' + insErr.message)
        return
      }
      itemId = created.id

      const { error: targetErr } = await supabase.from('coaching_item_targets').insert([...selected].map((studentId) => ({ item_id: itemId, student_id: studentId })))
      if (targetErr) {
        setSaving(false)
        setError('대상 학생 지정 실패: ' + targetErr.message)
        return
      }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <ModalWrap onClose={onClose} width={440}>
      <ModalTitle>{isEdit ? '항목 수정' : '새 항목 만들기'}</ModalTitle>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 8 }}>
          {!lockType && (
            <div style={{ flex: 1 }}>
              <Field label="유형">
                <Select value={itemType} onChange={(e) => handleTypeChange(e.target.value)}>
                  <option value="숙제">숙제</option>
                  <option value="시험">시험</option>
                </Select>
              </Field>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <Field label={itemType === '숙제' ? '등록일' : '날짜'}>
              <Input type="date" value={postedDate} onChange={(e) => handlePostedDateChange(e.target.value)} required />
            </Field>
          </div>
        </div>
        {itemType === '숙제' && (
          <Field label="마감일 (다음 수업 · 코칭 리스트에 뜨는 날)">
            <Input type="date" value={dueDate} min={postedDate} onChange={(e) => setDueDate(e.target.value)} required />
          </Field>
        )}
        <Field label="항목명">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 3강 변형문제 풀기" required />
        </Field>
        <Field label="페이지 (선택)">
          <Input value={page} onChange={(e) => setPage(e.target.value)} />
        </Field>
        <Field label="대상 학생">
          {loadingTargets ? (
            <p style={{ fontSize: 12.5, color: T.inkFaint }}>불러오는 중...</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxHeight: 140, overflowY: 'auto', padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: 8 }}>
              {students.map((s) => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: T.ink, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleStudent(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          )}
        </Field>

        <InlineError>{error}</InlineError>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
            취소
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving || loadingTargets} style={{ flex: 1 }}>
            {saving ? '저장 중...' : isEdit ? '저장' : '등록'}
          </PrimaryButton>
        </div>
      </form>
    </ModalWrap>
  )
}
