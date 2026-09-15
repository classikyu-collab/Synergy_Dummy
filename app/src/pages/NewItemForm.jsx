import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const today = () => new Date().toISOString().slice(0, 10)

export default function NewItemForm({ classId, students, onCreated }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [itemType, setItemType] = useState('숙제')
  const [name, setName] = useState('')
  const [page, setPage] = useState('')
  const [selected, setSelected] = useState(() => new Set(students.map((s) => s.id)))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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

    setSaving(true)
    const { data: item, error: itemErr } = await supabase
      .from('coaching_items')
      .insert({
        class_id: classId,
        date,
        item_type: itemType,
        name: name.trim(),
        page: page.trim() || null,
        target_mode: 'explicit',
        source: '담임입력(웹)',
      })
      .select()
      .single()

    if (itemErr) {
      setError('항목 등록 실패: ' + itemErr.message)
      setSaving(false)
      return
    }

    const { error: targetErr } = await supabase
      .from('coaching_item_targets')
      .insert([...selected].map((studentId) => ({ item_id: item.id, student_id: studentId })))

    setSaving(false)
    if (targetErr) {
      setError('대상 학생 지정 실패: ' + targetErr.message)
      return
    }

    setName('')
    setPage('')
    setOpen(false)
    onCreated(item)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ padding: '8px 12px', marginBottom: 12 }}>
        + 새 항목 만들기
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ border: '1px solid #ccc', borderRadius: 6, padding: 12, marginBottom: 16 }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
          <option value="숙제">숙제</option>
          <option value="시험">시험</option>
        </select>
      </div>
      <div style={{ marginBottom: 8 }}>
        <input
          type="text"
          placeholder="항목명 (예: 3강 변형문제 풀기)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: 6, boxSizing: 'border-box' }}
          required
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <input
          type="text"
          placeholder="페이지 (선택)"
          value={page}
          onChange={(e) => setPage(e.target.value)}
          style={{ width: '100%', padding: 6, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <p style={{ margin: '4px 0' }}>대상 학생</p>
        {students.map((s) => (
          <label key={s.id} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={selected.has(s.id)}
              onChange={() => toggleStudent(s.id)}
            />{' '}
            {s.name}
          </label>
        ))}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button type="submit" disabled={saving} style={{ marginRight: 8, padding: '6px 12px' }}>
        {saving ? '등록 중...' : '등록'}
      </button>
      <button type="button" onClick={() => setOpen(false)} style={{ padding: '6px 12px' }}>
        취소
      </button>
    </form>
  )
}
