import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { PageHeader, PageLoading, PageError, EmptyState, TableCard, SmallButton, DangerButton, PrimaryButton } from '../lib/adminUI'
import { todayStr, toDateStr } from '../lib/statusColors'
import ItemFormModal from './ItemFormModal'
import HomeworkComposer from './HomeworkComposer'

function nextClassDate(fromDateStr, scheduleDays) {
  if (!scheduleDays || scheduleDays.length === 0) return null
  const d = new Date(fromDateStr + 'T00:00:00')
  for (let i = 0; i < 14; i++) {
    d.setDate(d.getDate() + 1)
    if (scheduleDays.includes(d.getDay())) {
      return toDateStr(d)
    }
  }
  return null
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${dateStr.slice(5).replace('-', '/')} (${WEEKDAY_LABELS[d.getDay()]}) 등록`
}

export default function HomeworkRegister({ teacher }) {
  const { classId } = useParams()
  const [classInfo, setClassInfo] = useState(null)
  const [students, setStudents] = useState(null)
  const [items, setItems] = useState(null)
  const [targetNamesByItem, setTargetNamesByItem] = useState({})
  const [scheduleDays, setScheduleDays] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [openDates, setOpenDates] = useState(() => new Set())

  function toggleGroup(postedDate) {
    setOpenDates((prev) => {
      const next = new Set(prev)
      next.has(postedDate) ? next.delete(postedDate) : next.add(postedDate)
      return next
    })
  }

  async function loadItems() {
    const { data: its, error: itemErr } = await supabase
      .from('coaching_items')
      .select('id, date, posted_date, item_type, name, page')
      .eq('class_id', classId)
      .eq('item_type', '숙제')
      .is('deleted_at', null)
      .order('posted_date', { ascending: false })
      .order('priority', { ascending: true, nullsFirst: false })
      .limit(30)
    if (itemErr) {
      setError('항목을 불러오지 못했습니다: ' + itemErr.message)
      return
    }
    setItems(its)

    const itemIds = its.map((it) => it.id)
    if (itemIds.length === 0) {
      setTargetNamesByItem({})
      return
    }
    const { data: targets } = await supabase.from('coaching_item_targets').select('item_id, students(name)').in('item_id', itemIds)
    const byItem = {}
    ;(targets ?? []).forEach((t) => {
      if (!byItem[t.item_id]) byItem[t.item_id] = []
      byItem[t.item_id].push(t.students?.name)
    })
    setTargetNamesByItem(byItem)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: cls, error: clsErr }, { data: studs, error: studErr }, { data: sched }] = await Promise.all([
        supabase.from('classes').select('id, name, class_type, status').eq('id', classId).single(),
        supabase.from('students').select('id, name, difficulty_tier, status').eq('class_id', classId).order('name'),
        supabase.from('class_schedules').select('day_of_week').eq('class_id', classId),
      ])
      if (cancelled) return
      if (clsErr || studErr) {
        setError('데이터를 불러오지 못했습니다: ' + (clsErr || studErr).message)
        return
      }
      setClassInfo(cls)
      setStudents(studs)
      setScheduleDays([...new Set((sched ?? []).map((s) => s.day_of_week))])
      await loadItems()
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId])

  async function handleDelete(item) {
    if (!confirm(`"${item.name}" 항목을 삭제할까요?`)) return
    const { error: deleteErr } = await supabase.from('coaching_items').update({ deleted_at: new Date().toISOString() }).eq('id', item.id)
    if (deleteErr) {
      setError('삭제 실패: ' + deleteErr.message)
      return
    }
    loadItems()
  }

  const suggestedDueDate = nextClassDate(todayStr(), scheduleDays)

  const groups = []
  const groupIndex = {}
  ;(items ?? []).forEach((it) => {
    if (!(it.posted_date in groupIndex)) {
      groupIndex[it.posted_date] = groups.length
      groups.push({ postedDate: it.posted_date, items: [] })
    }
    groups[groupIndex[it.posted_date]].items.push(it)
  })

  return (
    <div>
      <p style={{ marginBottom: 4 }}>
        <Link to={`/staff/classes/${classId}`} style={{ fontSize: 12.5, color: T.inkMuted }}>
          ← {classInfo?.name ?? '반'} 상세로
        </Link>
      </p>

      <PageError>{error}</PageError>
      {!classInfo && !error && <PageLoading />}

      {classInfo && (
        <>
          <PageHeader
            title={`${classInfo.name} 숙제 등록`}
            subtitle={
              suggestedDueDate
                ? `다음 수업일은 ${suggestedDueDate.slice(5).replace('-', '/')} (${WEEKDAY_LABELS[new Date(suggestedDueDate + 'T00:00:00').getDay()]})이에요. 오늘 등록하면 마감일로 미리 채워드려요.`
                : '학생들이 다음 수업까지 해와야 할 숙제를 등록하세요.'
            }
            action={
              <PrimaryButton onClick={() => setCreating(true)} disabled={!students}>
                + 숙제 등록
              </PrimaryButton>
            }
          />

          {groups.length === 0 && <EmptyState>등록된 숙제가 없습니다.</EmptyState>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groups.map((group) => {
              const isOpen = openDates.has(group.postedDate)
              return (
                <TableCard key={group.postedDate}>
                  <div
                    onClick={() => toggleGroup(group.postedDate)}
                    style={{
                      padding: '13px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: T.inkFaint, fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: T.ink }}>{formatDateLabel(group.postedDate)}</span>
                    <span style={{ fontSize: 12, color: T.inkFaint }}>{group.items.length}건</span>
                  </div>
                  {isOpen &&
                    (() => {
                      const commonItems = group.items.filter((it) => (targetNamesByItem[it.id]?.length ?? 0) !== 1)
                      const personalItems = group.items.filter((it) => (targetNamesByItem[it.id]?.length ?? 0) === 1)
                      return (
                        <div style={{ borderTop: `1px solid ${T.border}` }}>
                          {commonItems.map((it, i) => (
                            <div
                              key={it.id}
                              style={{
                                padding: '12px 20px',
                                borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                              }}
                            >
                              <div style={{ fontSize: 13.5, color: T.ink }}>
                                {it.name}
                                {it.page ? <span style={{ color: T.inkMuted }}> (p.{it.page})</span> : ''}
                                <span style={{ color: T.inkFaint, marginLeft: 8, fontSize: 12.5 }}>{it.date.slice(5).replace('-', '/')}까지</span>
                              </div>
                              <div style={{ flexShrink: 0 }}>
                                <SmallButton onClick={() => setEditingItem(it)} style={{ marginRight: 6 }}>
                                  수정
                                </SmallButton>
                                <DangerButton onClick={() => handleDelete(it)} style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                                  삭제
                                </DangerButton>
                              </div>
                            </div>
                          ))}

                          {personalItems.length > 0 && (
                            <div
                              style={{
                                borderTop: commonItems.length > 0 ? `1px solid ${T.border}` : 'none',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                              }}
                            >
                              {personalItems.map((it, i) => (
                                <div
                                  key={it.id}
                                  style={{
                                    padding: '12px 16px',
                                    borderTop: i < 2 ? 'none' : `1px solid ${T.border}`,
                                    borderLeft: i % 2 === 1 ? `1px solid ${T.border}` : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 6,
                                  }}
                                >
                                  <div style={{ fontSize: 13, color: T.ink, minWidth: 0 }}>
                                    {it.name}
                                    {it.page ? <span style={{ color: T.inkMuted }}> (p.{it.page})</span> : ''}
                                    <span style={{ color: T.primaryDark, fontWeight: 700, marginLeft: 6 }}>· {targetNamesByItem[it.id][0]}</span>
                                  </div>
                                  <div style={{ flexShrink: 0, display: 'flex', gap: 4 }}>
                                    <SmallButton onClick={() => setEditingItem(it)} style={{ padding: '5px 8px', fontSize: 11.5 }}>
                                      수정
                                    </SmallButton>
                                    <DangerButton onClick={() => handleDelete(it)} style={{ width: 'auto', padding: '5px 8px', fontSize: 11.5 }}>
                                      삭제
                                    </DangerButton>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                </TableCard>
              )
            })}
          </div>

          {creating && students && (
            <HomeworkComposer
              classId={classId}
              students={students}
              initialPostedDate={todayStr()}
              initialDueDate={suggestedDueDate}
              onClose={() => setCreating(false)}
              onSaved={() => {
                setCreating(false)
                setOpenDates((prev) => new Set(prev).add(todayStr()))
                loadItems()
              }}
            />
          )}

          {editingItem && students && (
            <ItemFormModal
              classId={classId}
              students={students}
              item={editingItem}
              lockType="숙제"
              onClose={() => setEditingItem(null)}
              onSaved={() => {
                setEditingItem(null)
                loadItems()
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
