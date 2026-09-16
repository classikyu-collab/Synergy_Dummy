import { Fragment, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { useToast } from '../lib/toast'
import {
  PageHeader,
  PageLoading,
  PageError,
  EmptyState,
  PrimaryButton,
  GhostButton,
  SmallButton,
  DangerButton,
  Field,
  Input,
  Select,
  ModalWrap,
  ModalTitle,
  InlineError,
} from '../lib/adminUI'
import BulkAssignModal from './BulkAssignModal'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const SESSION_TYPES = ['코칭', '티칭']
const TEACHING_COLOR = '#1d4ed8'
const COACHING_COLOR = '#c0392b'

const TEACHER_COLORS = ['#6366f1', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#db2777', '#65a30d', '#0d9488', '#4338ca']

function colorForTeacher(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return TEACHER_COLORS[hash % TEACHER_COLORS.length]
}

const FILTERS = [
  { key: 'all', label: '전체 (티칭+코칭)' },
  { key: 'teaching', label: '티칭만' },
  { key: 'coaching', label: '코칭만' },
]

export default function AdminScheduleList() {
  const showToast = useToast()
  const [view, setView] = useState('week') // 'week' | 'teacher'
  const [filter, setFilter] = useState('all') // 'all' | 'teaching' | 'coaching'
  const [schedules, setSchedules] = useState(null)
  const [studentsByClass, setStudentsByClass] = useState({})
  const [classes, setClasses] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [assigningClass, setAssigningClass] = useState(null) // { id, name } or null
  const [settingClass, setSettingClass] = useState(null) // { id, name } or null
  const [pickerClassId, setPickerClassId] = useState('')

  async function reload() {
    const { data, error: fetchErr } = await supabase
      .from('class_schedules')
      .select('id, class_id, day_of_week, start_time, end_time, session_type, room, classes!inner(name, homeroom_teacher_id, teachers(name), status)')
      .eq('classes.status', '운영중')
      .order('start_time')
    if (fetchErr) {
      setError('시간표를 불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setSchedules(data)
  }

  async function loadStudents() {
    const { data } = await supabase.from('students').select('id, name, class_id').eq('status', '재원').order('name')
    const map = {}
    for (const s of data ?? []) {
      if (!s.class_id) continue
      ;(map[s.class_id] ??= []).push(s.name)
    }
    setStudentsByClass(map)
  }

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('id, name').eq('status', '운영중').order('name')
    setClasses(data ?? [])
  }

  useEffect(() => {
    reload()
    loadStudents()
    loadClasses()
  }, [])

  // 요일별로, 같은 반의 티칭/코칭 시간표를 하나의 카드로 합친다.
  const byDay = useMemo(() => {
    const grouped = Array.from({ length: 7 }, () => new Map()) // day -> classId -> { className, classId, teaching[], coaching[] }
    for (const s of schedules ?? []) {
      const day = grouped[s.day_of_week]
      if (!day) continue
      if (!day.has(s.class_id)) {
        day.set(s.class_id, {
          classId: s.class_id,
          className: s.classes?.name ?? '(알수없음)',
          teacherName: s.classes?.teachers?.name ?? '담임 미배정',
          teaching: [],
          coaching: [],
        })
      }
      const entry = day.get(s.class_id)
      if (s.session_type === '티칭') entry.teaching.push(s)
      else entry.coaching.push(s)
    }
    // 반 목록을 만든 뒤, "같은 시간대(세션)"인 반들끼리 한 행으로 묶는다
    // (같은 요일·같은 시간이라도 강의실이 다르면 여러 반이 동시에 진행될 수 있어서).
    function rowKeyOf(c) {
      const primary = filter === 'coaching' ? c.coaching[0] : c.teaching[0] ?? c.coaching[0]
      return primary ? `${primary.start_time}~${primary.end_time}` : '99:99'
    }
    function sortKeyOf(c) {
      const primary = filter === 'coaching' ? c.coaching[0] : c.teaching[0] ?? c.coaching[0]
      return primary?.start_time ?? '99:99'
    }
    return grouped.map((dayMap) => {
      let list = Array.from(dayMap.values())
      if (filter === 'teaching') list = list.filter((c) => c.teaching.length > 0)
      if (filter === 'coaching') list = list.filter((c) => c.coaching.length > 0)
      list.sort((a, b) => sortKeyOf(a).localeCompare(sortKeyOf(b)))

      const rows = []
      for (const c of list) {
        const key = rowKeyOf(c)
        const lastRow = rows[rows.length - 1]
        if (lastRow && lastRow.key === key) {
          lastRow.items.push(c)
        } else {
          rows.push({ key, items: [c] })
        }
      }
      // 같은 세션(시간대) 안에서는 담임 이름 순으로 왼쪽→오른쪽 정렬
      for (const row of rows) {
        row.items.sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ko'))
      }
      return rows
    })
  }, [schedules, filter])

  const byTeacher = useMemo(() => {
    const groups = new Map() // teacherName -> className -> [schedule...]
    for (const s of schedules ?? []) {
      const teacherName = s.classes?.teachers?.name ?? '담임 미배정'
      const className = s.classes?.name ?? '(알수없음)'
      if (!groups.has(teacherName)) groups.set(teacherName, new Map())
      const classMap = groups.get(teacherName)
      if (!classMap.has(className)) classMap.set(className, { classId: s.class_id, items: [] })
      classMap.get(className).items.push(s)
    }
    return groups
  }, [schedules])

  const teacherNames = useMemo(() => Array.from(byTeacher.keys()).sort((a, b) => a.localeCompare(b, 'ko')), [byTeacher])
  const [selectedTeacherName, setSelectedTeacherName] = useState('')

  useEffect(() => {
    if (!selectedTeacherName && teacherNames.length > 0) {
      setSelectedTeacherName(teacherNames[0])
    }
  }, [teacherNames, selectedTeacherName])

  // 인쇄용 표 구조: 요일마다 독립된 표 하나 — 그 요일의 세션(시간대)들이 세로로 쌓이고,
  // 열 개수는 "그 요일에서 가장 많이 겹치는 세션의 반 개수"만큼만 쓴다 (하루 전체 반 개수가 아님).
  const printDays = useMemo(() => {
    return DAY_LABELS.map((label, day) => {
      if (day === 0) return null
      const rows = byDay[day].map((row) => ({
        key: row.key,
        items: row.items.map((c) => ({ ...c, students: studentsByClass[c.classId] ?? [] })),
      }))
      const maxCols = Math.max(1, ...rows.map((r) => r.items.length))
      return { day, label, rows, maxCols }
    }).filter(Boolean)
  }, [byDay, studentsByClass])

  // 담임별 시간표 인쇄용: 주간 표와 같은 구조를 그 담임 소속 반만 걸러서 재사용한다.
  const printDaysForTeacher = useMemo(() => {
    if (!selectedTeacherName) return []
    return printDays.map((day) => {
      const rows = day.rows
        .map((row) => ({ ...row, items: row.items.filter((c) => c.teacherName === selectedTeacherName) }))
        .filter((row) => row.items.length > 0)
      const maxCols = Math.max(1, ...rows.map((r) => r.items.length))
      return { ...day, rows, maxCols }
    })
  }, [printDays, selectedTeacherName])

  return (
    <div>
      <PageHeader
        title="시간표 관리"
        subtitle="코칭·티칭 시간표를 등록하고, 주간/담임별로 확인·인쇄합니다."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Select value={pickerClassId} onChange={(e) => setPickerClassId(e.target.value)} style={{ width: 160 }}>
              <option value="">반 선택...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <GhostButton
              disabled={!pickerClassId}
              onClick={() => setSettingClass({ id: pickerClassId, name: classes.find((c) => c.id === pickerClassId)?.name })}
            >
              반별 시간 설정
            </GhostButton>
            <PrimaryButton onClick={() => setCreating(true)}>+ 시간표 등록</PrimaryButton>
          </div>
        }
      />

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <ViewTab active={view === 'week'} onClick={() => setView('week')}>
            주간 시간표
          </ViewTab>
          <ViewTab active={view === 'teacher'} onClick={() => setView('teacher')}>
            담임별 시간표
          </ViewTab>
        </div>
        <GhostButton onClick={() => window.print()}>인쇄 / PDF로 저장</GhostButton>
      </div>

      {view === 'week' && (
        <div className="no-print" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <FilterTab key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </FilterTab>
          ))}
        </div>
      )}

      {view === 'teacher' && (
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.inkMuted }}>담임 선택</span>
          <Select value={selectedTeacherName} onChange={(e) => setSelectedTeacherName(e.target.value)} style={{ width: 160 }}>
            {teacherNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <PageError>{error}</PageError>
      {!schedules && !error && <PageLoading />}

      {schedules && view === 'week' && (
        <div id="print-area" className="page-frame">
          {DAY_LABELS.map((label, day) => {
            if (day === 0) return null // 일요일은 휴원
            return (
              <div key={day} className="schedule-day" style={{ marginBottom: 16 }}>
                <p className="schedule-day-label" style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: T.ink }}>{label}요일</p>
                {byDay[day].length === 0 ? (
                  <p style={{ fontSize: 12, color: T.inkFaint, margin: '0 0 4px' }}>없음</p>
                ) : (
                  <div className="schedule-day-rows" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {byDay[day].map((row) => (
                      <div key={row.key} className="schedule-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {row.items.map((c) => (
                          <div key={c.classId} className="schedule-card-wrap" style={{ flex: '1 1 220px', minWidth: 200, maxWidth: 280 }}>
                            <ClassCard
                              classInfo={c}
                              filter={filter}
                              students={studentsByClass[c.classId] ?? []}
                              onEditSchedule={(s) => setEditing(s)}
                              onAssignStudents={() => setAssigningClass({ id: c.classId, name: c.className })}
                              onSetClassSchedule={() => setSettingClass({ id: c.classId, name: c.className })}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {schedules && view === 'week' && (
        <div className="print-table-wrap">
          <PrintScheduleTable printDays={printDays} />
        </div>
      )}

      {schedules && view === 'teacher' && (
        <div id="print-area" className="page-frame">
          {!selectedTeacherName || printDaysForTeacher.every((d) => d.rows.length === 0) ? (
            <EmptyState>등록된 시간표가 없습니다.</EmptyState>
          ) : (
            <div>
              <p style={{ margin: '0 0 12px', fontSize: 14.5, fontWeight: 800, color: T.primaryDark }}>{selectedTeacherName}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                {printDaysForTeacher.map((day) => (
                  <p key={`${day.day}-label`} className="schedule-day-label" style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: T.ink }}>
                    {day.label}요일
                  </p>
                ))}
                {Array.from({ length: Math.max(1, ...printDaysForTeacher.map((d) => d.rows.length)) }, (_, rowIdx) =>
                  printDaysForTeacher.map((day) => {
                    const row = day.rows[rowIdx]
                    if (!row) {
                      return rowIdx === 0 && day.rows.length === 0 ? (
                        <p key={`${day.day}-empty`} style={{ fontSize: 11.5, color: T.inkFaint, margin: 0 }}>
                          없음
                        </p>
                      ) : (
                        <div key={`${day.day}-${rowIdx}-blank`} />
                      )
                    }
                    return (
                      <div key={`${day.day}-${rowIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
                        {row.items.map((c) => (
                          <ClassCard
                            key={c.classId}
                            classInfo={c}
                            filter="all"
                            students={c.students}
                            onEditSchedule={(s) => setEditing(s)}
                            onAssignStudents={() => setAssigningClass({ id: c.classId, name: c.className })}
                            onSetClassSchedule={() => setSettingClass({ id: c.classId, name: c.className })}
                          />
                        ))}
                      </div>
                    )
                  }),
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {schedules && view === 'teacher' && selectedTeacherName && (
        <div className="print-table-wrap">
          <PrintScheduleTable
            printDays={printDaysForTeacher}
            title={`SYNAPSE ${selectedTeacherName} 담임 시간표`}
            subtitle="전체 시간표 (티칭+코칭)"
          />
        </div>
      )}

      {creating && (
        <ScheduleModal
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
        <ScheduleModal
          schedule={editing}
          classes={classes}
          onClose={() => setEditing(null)}
          onDone={(msg) => {
            setEditing(null)
            showToast(msg)
            reload()
          }}
        />
      )}

      {assigningClass && (
        <BulkAssignModal
          classes={classes}
          initialTargetClassId={assigningClass.id}
          onClose={() => setAssigningClass(null)}
          onDone={(msg) => {
            setAssigningClass(null)
            showToast(msg)
            loadStudents()
          }}
        />
      )}

      {settingClass && (
        <ClassScheduleEditor
          classInfo={settingClass}
          onClose={() => setSettingClass(null)}
          onDone={(msg) => {
            setSettingClass(null)
            showToast(msg)
            reload()
          }}
        />
      )}
    </div>
  )
}

function blankSession() {
  return {
    day: '',
    코칭: { enabled: true, id: null, start: '18:30', end: '19:30', room: '' },
    티칭: { enabled: true, id: null, start: '17:00', end: '18:20', room: '' },
  }
}

// 반 하나는 주 2회 수업하고, 매 수업마다 티칭+코칭이 항상 세트로 진행된다 (둘 사이에 쉬는 시간이 있어 시간은 독립 입력).
// 그래서 "요일 7개" 그리드가 아니라 "세션 1 / 세션 2" 딱 2개 블록으로 반의 주간 시간표를 관리한다.
function ClassScheduleEditor({ classInfo, onClose, onDone }) {
  const [sessions, setSessions] = useState(() => [blankSession(), blankSession()])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('class_schedules')
        .select('id, day_of_week, session_type, start_time, end_time, room')
        .eq('class_id', classInfo.id)
        .order('day_of_week')
      if (cancelled) return
      const dayOrder = Array.from(new Set((data ?? []).map((r) => r.day_of_week))).slice(0, 2)
      const next = [blankSession(), blankSession()]
      dayOrder.forEach((day, sessionIdx) => {
        next[sessionIdx].day = String(day)
      })
      for (const row of data ?? []) {
        const sessionIdx = dayOrder.indexOf(row.day_of_week)
        if (sessionIdx === -1) continue // 세션 2개를 넘어서는 요일 데이터는 이 화면에서 다루지 않음
        next[sessionIdx][row.session_type] = {
          enabled: true,
          id: row.id,
          start: row.start_time?.slice(0, 5),
          end: row.end_time?.slice(0, 5),
          room: row.room ?? '',
        }
      }
      setSessions(next)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [classInfo.id])

  function updateSession(idx, patch) {
    setSessions((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  function updateSlot(sessionIdx, type, patch) {
    setSessions((prev) => {
      const next = [...prev]
      next[sessionIdx] = { ...next[sessionIdx], [type]: { ...next[sessionIdx][type], ...patch } }
      return next
    })
  }

  async function handleSave() {
    setLocalError('')
    const activeDays = sessions.map((s) => s.day).filter((d) => d !== '')
    if (new Set(activeDays).size !== activeDays.length) {
      setLocalError('세션 1과 세션 2에 같은 요일을 중복으로 선택할 수 없습니다.')
      return
    }
    setSubmitting(true)
    const ops = []
    sessions.forEach((session) => {
      SESSION_TYPES.forEach((type) => {
        const slot = session[type]
        const active = session.day !== '' && slot.enabled
        if (active) {
          const payload = {
            class_id: classInfo.id,
            day_of_week: Number(session.day),
            session_type: type,
            start_time: slot.start,
            end_time: slot.end,
            room: slot.room || null,
          }
          ops.push(
            slot.id
              ? supabase.from('class_schedules').update(payload).eq('id', slot.id)
              : supabase.from('class_schedules').insert(payload),
          )
        } else if (slot.id) {
          ops.push(supabase.from('class_schedules').delete().eq('id', slot.id))
        }
      })
    })
    const results = await Promise.all(ops)
    setSubmitting(false)
    const failed = results.find((r) => r.error)
    if (failed) {
      setLocalError('저장 중 일부 실패: ' + failed.error.message)
      return
    }
    onDone(`${classInfo.name}의 시간표가 저장되었습니다.`)
  }

  return (
    <ModalWrap onClose={onClose} width={580}>
      <ModalTitle>{classInfo.name} — 반별 시간 설정</ModalTitle>
      <InlineError>{localError}</InlineError>
      {loading ? (
        <p style={{ color: T.inkFaint, fontSize: 13 }}>불러오는 중...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sessions.map((session, idx) => (
            <div key={idx} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: T.ink }}>세션 {idx + 1}</p>
                <Select value={session.day} onChange={(e) => updateSession(idx, { day: e.target.value })} style={{ width: 130 }}>
                  <option value="">요일 선택 안함</option>
                  {DAY_LABELS.map((label, dayIdx) => (
                    <option key={dayIdx} value={dayIdx}>
                      {label}요일
                    </option>
                  ))}
                </Select>
              </div>
              <SessionSlotEditor label="티칭" color={TEACHING_COLOR} slot={session.티칭} disabled={!session.day} onChange={(patch) => updateSlot(idx, '티칭', patch)} />
              <SessionSlotEditor label="코칭" color={COACHING_COLOR} slot={session.코칭} disabled={!session.day} onChange={(patch) => updateSlot(idx, '코칭', patch)} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
          취소
        </GhostButton>
        <PrimaryButton type="button" onClick={handleSave} disabled={submitting || loading} style={{ flex: 1 }}>
          {submitting ? '저장 중...' : '저장'}
        </PrimaryButton>
      </div>
    </ModalWrap>
  )
}

function SessionSlotEditor({ label, color, slot, disabled, onChange }) {
  const fieldDisabled = disabled || !slot.enabled
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, width: 66, flexShrink: 0 }}>
        <input type="checkbox" checked={slot.enabled} disabled={disabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
      </label>
      <input
        type="time"
        value={slot.start}
        disabled={fieldDisabled}
        onChange={(e) => onChange({ start: e.target.value })}
        style={{ flex: 1, fontSize: 12, padding: '5px 6px', border: `1px solid ${T.border}`, borderRadius: 6, opacity: fieldDisabled ? 0.4 : 1, colorScheme: 'light' }}
      />
      <span style={{ fontSize: 11, color: T.inkFaint }}>~</span>
      <input
        type="time"
        value={slot.end}
        disabled={fieldDisabled}
        onChange={(e) => onChange({ end: e.target.value })}
        style={{ flex: 1, fontSize: 12, padding: '5px 6px', border: `1px solid ${T.border}`, borderRadius: 6, opacity: fieldDisabled ? 0.4 : 1, colorScheme: 'light' }}
      />
      <input
        type="text"
        value={slot.room}
        disabled={fieldDisabled}
        onChange={(e) => onChange({ room: e.target.value })}
        placeholder="강의실"
        style={{ width: 64, fontSize: 12, padding: '5px 6px', border: `1px solid ${T.border}`, borderRadius: 6, opacity: fieldDisabled ? 0.4 : 1, colorScheme: 'light' }}
      />
    </div>
  )
}

function ViewTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12.5,
        fontWeight: 700,
        padding: '8px 14px',
        borderRadius: 999,
        border: `1px solid ${active ? T.primary : T.border}`,
        background: active ? T.primaryTint : '#fff',
        color: active ? T.primaryDark : T.inkMuted,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function FilterTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: '6px 12px',
        borderRadius: 8,
        border: `1px solid ${active ? T.ink : T.border}`,
        background: active ? T.ink : '#fff',
        color: active ? '#fff' : T.inkMuted,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function timeRangeText(entries) {
  return entries
    .map((s) => `${s.start_time?.slice(0, 5)}~${s.end_time?.slice(0, 5)}${s.room ? ` (${s.room})` : ''}`)
    .join(', ')
}

function timeStartText(entries) {
  return entries.map((s) => `${s.start_time?.slice(0, 5)}${s.room ? ` (${s.room})` : ''}`).join(', ')
}

// 학생 이름 두 명씩 줄바꿈하며 한 칸에 합쳐서 보여준다 (칸을 여러 행으로 쪼개지 않음).
function studentBlock(students) {
  const lines = []
  for (let i = 0; i < students.length; i += 2) {
    lines.push([students[i], students[i + 1]].filter(Boolean).join(' '))
  }
  return lines.map((line, i) => (
    <span key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </span>
  ))
}

// 화면용 카드 뷰와 별개로, 인쇄에서는 요일마다 독립된 표를 만든다. 표의 열 개수는 그 요일 전체 반 개수가
// 아니라 "그 요일에서 가장 많이 겹치는 세션(시간대)의 반 개수"만큼만 쓰고, 세션이 여러 번이면 아래로
// 새 행 블록을 쌓는다 -- 그래야 열이 요일마다 늘어나지 않아서 글자가 잘리지 않는다.
function PrintScheduleTable({ printDays, title = 'SYNAPSE 주간 시간표', subtitle = '코칭·티칭 통합 시간표 — 담임별 색상으로 구분됩니다.' }) {
  return (
    <div>
      <div className="print-header">
        <p className="print-title">{title}</p>
        <p className="print-subtitle">{subtitle}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
        {printDays.map((day) => (
          <table key={day.day} className="print-schedule-table">
            <thead>
              <tr>
                <th colSpan={day.maxCols}>{day.label}요일</th>
              </tr>
            </thead>
            <tbody>
              {day.rows.length === 0 && (
                <tr>
                  <td colSpan={day.maxCols}>-</td>
                </tr>
              )}
              {day.rows.map((row) => {
                const padded = Array.from({ length: day.maxCols }, (_, i) => row.items[i] ?? null)
                const borderStyle = (c) => (c ? { borderLeft: `3px solid ${colorForTeacher(c.teacherName)}` } : undefined)
                return (
                  <Fragment key={row.key}>
                    <tr>
                      {padded.map((c, i) => (
                        <td key={i} className="print-cell-class" style={borderStyle(c)}>
                          {c?.className ?? ''}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      {padded.map((c, i) => (
                        <td key={i} className="print-cell-teaching" style={borderStyle(c)}>
                          {c && c.teaching.length > 0 ? `티칭 ${timeStartText(c.teaching)} (${c.students.length})` : ''}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      {padded.map((c, i) => (
                        <td key={i} className="print-cell-coaching" style={borderStyle(c)}>
                          {c && c.coaching.length > 0 ? `코칭 ${timeStartText(c.coaching)} (${c.students.length})` : ''}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      {padded.map((c, i) => (
                        <td key={i} className="print-cell-student" style={borderStyle(c)}>
                          {c ? studentBlock(c.students) : ''}
                        </td>
                      ))}
                    </tr>
                    <tr className="print-spacer-row">
                      {padded.map((_, i) => (
                        <td key={i} />
                      ))}
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        ))}
      </div>
    </div>
  )
}

function ClassCard({ classInfo, filter, students, onEditSchedule, onAssignStudents, onSetClassSchedule }) {
  const { className, teacherName, teaching, coaching } = classInfo
  const showTeaching = filter !== 'coaching' && teaching.length > 0
  const showCoaching = filter !== 'teaching' && coaching.length > 0
  const teacherColor = colorForTeacher(teacherName)

  return (
    <div
      className="schedule-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        marginBottom: 10,
        padding: '8px 10px',
        borderRadius: 10,
        background: '#fff',
        border: `2px solid ${teacherColor}`,
        borderLeft: `6px solid ${teacherColor}`,
      }}
    >
      <div className="schedule-card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <p
          onClick={onSetClassSchedule}
          className="no-print-cursor"
          style={{ margin: 0, fontSize: 13, fontWeight: 800, color: T.ink, cursor: 'pointer' }}
        >
          {className} <span style={{ fontWeight: 500, fontSize: 11, color: T.inkFaint }}>({students.length}명)</span>
        </p>
        <button
          className="no-print"
          onClick={onAssignStudents}
          style={{ fontSize: 10.5, fontWeight: 600, color: T.primaryDark, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          학생 배정
        </button>
      </div>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: teacherColor }}>{teacherName}</p>

      {showTeaching && (
        <p
          className="schedule-card-time"
          onClick={() => onEditSchedule(teaching[0])}
          style={{ margin: '0 0 1px', fontSize: 12, fontWeight: 700, color: TEACHING_COLOR, cursor: 'pointer' }}
        >
          티칭 {timeRangeText(teaching)}
        </p>
      )}
      {showCoaching && (
        <p
          className="schedule-card-time"
          onClick={() => onEditSchedule(coaching[0])}
          style={{ margin: '0 0 2px', fontSize: 12, color: COACHING_COLOR, cursor: 'pointer' }}
        >
          코칭 {timeRangeText(coaching)}
        </p>
      )}

      <div
        className="schedule-card-students"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridAutoRows: 'min-content',
          alignContent: 'start',
          gap: '2px 8px',
          marginTop: 2,
          flex: 1,
        }}
      >
        {students.length > 0 ? (
          students.map((name) => (
            <span key={name} style={{ fontSize: 10.5, color: T.ink }}>
              {name}
            </span>
          ))
        ) : (
          <span style={{ fontSize: 10.5, color: T.inkFaint }}>학생 없음</span>
        )}
      </div>
    </div>
  )
}

function ScheduleModal({ schedule, classes, onClose, onDone }) {
  const [classId, setClassId] = useState(schedule?.class_id ?? classes[0]?.id ?? '')
  const [dayOfWeek, setDayOfWeek] = useState(schedule?.day_of_week ?? 1)
  const [sessionType, setSessionType] = useState(schedule?.session_type ?? '코칭')
  const [startTime, setStartTime] = useState(schedule?.start_time?.slice(0, 5) ?? '16:00')
  const [endTime, setEndTime] = useState(schedule?.end_time?.slice(0, 5) ?? '17:00')
  const [room, setRoom] = useState(schedule?.room ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [localError, setLocalError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    if (!classId) {
      setLocalError('반을 선택해주세요.')
      return
    }
    setSubmitting(true)
    const payload = { class_id: classId, day_of_week: Number(dayOfWeek), session_type: sessionType, start_time: startTime, end_time: endTime, room: room || null }
    const query = schedule ? supabase.from('class_schedules').update(payload).eq('id', schedule.id) : supabase.from('class_schedules').insert(payload)
    const { error: dbErr } = await query
    setSubmitting(false)
    if (dbErr) {
      setLocalError((schedule ? '저장 실패: ' : '등록 실패: ') + dbErr.message)
      return
    }
    onDone(schedule ? '시간표가 수정되었습니다.' : '시간표가 등록되었습니다.')
  }

  async function handleDelete() {
    if (!confirm('이 시간표 항목을 삭제할까요?')) return
    setDeleting(true)
    const { error: dbErr } = await supabase.from('class_schedules').delete().eq('id', schedule.id)
    setDeleting(false)
    if (dbErr) {
      setLocalError('삭제 실패: ' + dbErr.message)
      return
    }
    onDone('시간표가 삭제되었습니다.')
  }

  return (
    <ModalWrap onClose={onClose}>
      <ModalTitle>{schedule ? '시간표 수정' : '시간표 등록'}</ModalTitle>
      <InlineError>{localError}</InlineError>
      <form onSubmit={handleSubmit}>
        <Field label="반">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="유형">
          <Select value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
            {SESSION_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="요일">
          <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
            {DAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}요일
              </option>
            ))}
          </Select>
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field label="시작 시간">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="종료 시간">
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </Field>
          </div>
        </div>
        <Field label="강의실">
          <Input type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="예: 201호" />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
            취소
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? '저장 중...' : schedule ? '저장' : '등록'}
          </PrimaryButton>
        </div>

        {schedule && (
          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 14 }}>
            <DangerButton type="button" onClick={handleDelete} disabled={deleting}>
              {deleting ? '삭제 중...' : '이 시간표 삭제'}
            </DangerButton>
          </div>
        )}
      </form>
    </ModalWrap>
  )
}
