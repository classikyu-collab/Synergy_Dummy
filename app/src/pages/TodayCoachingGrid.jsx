import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { TableCard, Th, Td, Tr, SmallButton, DangerButton, EmptyState, InlineError } from '../lib/adminUI'
import { todayStr } from '../lib/statusColors'

const UNSET = '__unset__'

export default function TodayCoachingGrid({ classId, students, teacherId, onEdit, refreshKey, onChanged }) {
  const [items, setItems] = useState(null)
  const [targetsByItem, setTargetsByItem] = useState({})
  const [recordsByKey, setRecordsByKey] = useState({})
  const [optionsByType, setOptionsByType] = useState({})
  const [error, setError] = useState('')
  const [savingKey, setSavingKey] = useState(null)

  async function load() {
    const today = todayStr()
    const { data: its, error: itemErr } = await supabase
      .from('coaching_items')
      .select('id, date, posted_date, item_type, name, page')
      .eq('class_id', classId)
      .eq('date', today)
      .is('deleted_at', null)
      .order('item_type')
      .order('name')
    if (itemErr) {
      setError('불러오지 못했습니다: ' + itemErr.message)
      return
    }
    setItems(its)

    const itemIds = its.map((i) => i.id)
    if (itemIds.length === 0) {
      setTargetsByItem({})
      setRecordsByKey({})
      return
    }

    const [{ data: targets }, { data: records }, { data: opts }] = await Promise.all([
      supabase.from('coaching_item_targets').select('item_id, student_id').in('item_id', itemIds),
      supabase.from('coaching_records').select('item_id, student_id, status_label, is_done').eq('round', 1).in('item_id', itemIds),
      supabase.from('status_options').select('item_type, label, is_done').eq('round', 1).eq('is_active', true).in('item_type', ['숙제', '시험']).order('label'),
    ])

    const tMap = {}
    ;(targets ?? []).forEach((t) => {
      if (!tMap[t.item_id]) tMap[t.item_id] = new Set()
      tMap[t.item_id].add(t.student_id)
    })
    setTargetsByItem(tMap)

    const rMap = {}
    ;(records ?? []).forEach((r) => {
      rMap[`${r.item_id}_${r.student_id}`] = r
    })
    setRecordsByKey(rMap)

    const oMap = {}
    ;(opts ?? []).forEach((o) => {
      if (!oMap[o.item_type]) oMap[o.item_type] = []
      oMap[o.item_type].push(o)
    })
    setOptionsByType(oMap)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, refreshKey])

  async function handleChange(item, studentId, label) {
    if (label === UNSET) return
    const option = (optionsByType[item.item_type] ?? []).find((o) => o.label === label)
    if (!option) return
    const key = `${item.id}_${studentId}`
    setSavingKey(key)
    const { data, error: upsertErr } = await supabase
      .from('coaching_records')
      .upsert(
        {
          student_id: studentId,
          item_id: item.id,
          round: 1,
          status_label: option.label,
          is_done: option.is_done,
          recorded_by_teacher_id: teacherId,
          recorded_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,item_id,round' }
      )
      .select('item_id, student_id, status_label, is_done')
      .single()
    setSavingKey(null)
    if (upsertErr) {
      setError('저장 실패: ' + upsertErr.message)
      return
    }
    setRecordsByKey((prev) => ({ ...prev, [key]: data }))
    onChanged?.()
  }

  async function handleDelete(item) {
    if (!confirm(`"${item.name}" 항목을 삭제할까요?`)) return
    const { error: deleteErr } = await supabase.from('coaching_items').update({ deleted_at: new Date().toISOString() }).eq('id', item.id)
    if (deleteErr) {
      setError('삭제 실패: ' + deleteErr.message)
      return
    }
    load()
    onChanged?.()
  }

  if (!items) return <p style={{ fontSize: 13, color: T.inkFaint }}>불러오는 중...</p>
  if (items.length === 0) return <EmptyState>오늘 날짜로 등록된 코칭 항목이 없습니다.</EmptyState>

  return (
    <>
      <InlineError>{error}</InlineError>
      <TableCard>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg }}>
                <Th w={220}>항목</Th>
                {students.map((s) => (
                  <Th key={s.id}>{s.name}</Th>
                ))}
                <th style={{ padding: '12px 20px' }} />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Tr key={item.id}>
                  <Td style={{ fontWeight: 700, color: T.ink }}>
                    <span style={{ color: T.inkFaint, fontWeight: 500 }}>{item.item_type}</span> {item.name}
                    {item.page ? <span style={{ color: T.inkMuted, fontWeight: 500 }}> (p.{item.page})</span> : ''}
                  </Td>
                  {students.map((s) => {
                    const isTarget = targetsByItem[item.id]?.has(s.id)
                    if (!isTarget) {
                      return (
                        <Td key={s.id} style={{ color: T.inkFaint, textAlign: 'center' }}>
                          –
                        </Td>
                      )
                    }
                    const key = `${item.id}_${s.id}`
                    const rec = recordsByKey[key]
                    const options = optionsByType[item.item_type] ?? []
                    return (
                      <Td key={s.id}>
                        <select
                          value={rec?.status_label ?? UNSET}
                          disabled={savingKey === key}
                          onChange={(e) => handleChange(item, s.id, e.target.value)}
                          style={{
                            fontSize: 12.5,
                            padding: '5px 8px',
                            borderRadius: 8,
                            border: `1px solid ${T.border}`,
                            colorScheme: 'light',
                            background: T.surface,
                            color: rec?.is_done ? '#186238' : T.inkMuted,
                          }}
                        >
                          {!rec && <option value={UNSET}>미체크</option>}
                          {options.map((o) => (
                            <option key={o.label} value={o.label}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </Td>
                    )
                  })}
                  <Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <SmallButton onClick={() => onEdit(item)} style={{ marginRight: 6 }}>
                      수정
                    </SmallButton>
                    <DangerButton onClick={() => handleDelete(item)} style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                      삭제
                    </DangerButton>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>
    </>
  )
}
