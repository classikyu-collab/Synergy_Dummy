import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ItemChecklist from './ItemChecklist'

export default function ItemRow({ item, teacherId, expanded, onToggleExpand, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [page, setPage] = useState(item.page ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('항목명을 입력해주세요.')
      return
    }
    setBusy(true)
    setError('')
    const { data, error: updateErr } = await supabase
      .from('coaching_items')
      .update({ name: name.trim(), page: page.trim() || null })
      .eq('id', item.id)
      .select()
      .single()
    setBusy(false)
    if (updateErr) {
      setError('수정 실패: ' + updateErr.message)
      return
    }
    onUpdated(data)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm(`"${item.name}" 항목을 삭제할까요?`)) return
    setBusy(true)
    const { error: deleteErr } = await supabase
      .from('coaching_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', item.id)
    setBusy(false)
    if (deleteErr) {
      setError('삭제 실패: ' + deleteErr.message)
      return
    }
    onDeleted(item.id)
  }

  if (editing) {
    return (
      <li style={{ borderBottom: '1px solid #ddd', padding: '6px 0' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, padding: 4 }} />
          <input
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="페이지"
            style={{ width: 100, padding: 4 }}
          />
          <button type="submit" disabled={busy}>
            저장
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={busy}>
            취소
          </button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </li>
    )
  }

  return (
    <li style={{ borderBottom: '1px solid #ddd', padding: '6px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ cursor: 'pointer', flex: 1 }} onClick={onToggleExpand}>
          {expanded ? '▼' : '▶'} [{item.date}] {item.item_type} — {item.name}
          {item.page ? ` (p.${item.page})` : ''}
        </div>
        <button onClick={() => setEditing(true)} disabled={busy} style={{ fontSize: 12 }}>
          수정
        </button>
        <button onClick={handleDelete} disabled={busy} style={{ fontSize: 12 }}>
          삭제
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {expanded && <ItemChecklist itemId={item.id} teacherId={teacherId} />}
    </li>
  )
}
