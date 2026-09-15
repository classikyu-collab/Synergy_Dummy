import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const UNSET = '__unset__'

export default function ItemChecklist({ itemId, itemType, teacherId }) {
  const [rows, setRows] = useState(null)
  const [options, setOptions] = useState(null)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: targets, error: targetErr }, { data: records, error: recordErr }, { data: opts, error: optErr }] =
        await Promise.all([
          supabase
            .from('coaching_item_targets')
            .select('student_id, students(id, name)')
            .eq('item_id', itemId),
          supabase
            .from('coaching_records')
            .select('id, student_id, is_done, status_label')
            .eq('item_id', itemId)
            .eq('round', 1),
          supabase
            .from('status_options')
            .select('label, is_done')
            .eq('item_type', itemType)
            .eq('round', 1)
            .eq('is_active', true)
            .order('label'),
        ])
      if (cancelled) return
      if (targetErr || recordErr || optErr) {
        setError('불러오지 못했습니다: ' + (targetErr || recordErr || optErr).message)
        return
      }
      setOptions(opts)
      const recordByStudent = Object.fromEntries(records.map((r) => [r.student_id, r]))
      setRows(
        targets
          .map((t) => ({
            studentId: t.student_id,
            name: t.students?.name ?? '(알 수 없음)',
            record: recordByStudent[t.student_id] ?? null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      )
    }
    load()
    return () => {
      cancelled = true
    }
  }, [itemId, itemType])

  async function handleChange(row, label) {
    if (label === UNSET) return
    const option = options.find((o) => o.label === label)
    setSavingId(row.studentId)
    const { data, error: upsertErr } = await supabase
      .from('coaching_records')
      .upsert(
        {
          student_id: row.studentId,
          item_id: itemId,
          round: 1,
          status_label: option.label,
          is_done: option.is_done,
          recorded_by_teacher_id: teacherId,
          recorded_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,item_id,round' }
      )
      .select('id, student_id, is_done, status_label')
      .single()
    setSavingId(null)
    if (upsertErr) {
      setError('저장 실패: ' + upsertErr.message)
      return
    }
    setRows((prev) => prev.map((r) => (r.studentId === row.studentId ? { ...r, record: data } : r)))
  }

  if (error) return <p style={{ color: 'red' }}>{error}</p>
  if (!rows || !options) return <p>불러오는 중...</p>
  if (rows.length === 0) return <p>대상 학생이 없습니다.</p>

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 16px' }}>
      {rows.map((row) => (
        <li key={row.studentId} style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ minWidth: 80 }}>{row.name}</span>
          <select
            value={row.record?.status_label ?? UNSET}
            disabled={savingId === row.studentId}
            onChange={(e) => handleChange(row, e.target.value)}
          >
            {!row.record && <option value={UNSET}>미체크</option>}
            {options.map((o) => (
              <option key={o.label} value={o.label}>
                {o.label}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  )
}
