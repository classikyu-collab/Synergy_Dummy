import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { useToast } from '../lib/toast'
import { Th, Td, Tr, StatusBadge, SmallButton, TableCard, Input, PageHeader, PageLoading, PageError } from '../lib/adminUI'

export default function AdminSchoolExams() {
  const showToast = useToast()
  const [worksheets, setWorksheets] = useState(null)
  const [classes, setClasses] = useState([])
  const [mappings, setMappings] = useState([])
  const [error, setError] = useState('')
  const [gradeFilter, setGradeFilter] = useState('전체')
  const [search, setSearch] = useState('')

  async function reload() {
    const [{ data: wsRows, error: wsErr }, { data: classRows }, { data: mapRows }] = await Promise.all([
      supabase
        .from('school_exam_worksheets')
        .select('id, grade, unit_name, publisher_author, worksheet_type, series, is_hidden, school_exam_questions(count)')
        .order('grade')
        .order('unit_name'),
      supabase.from('classes').select('id, name').eq('status', '운영중').order('name'),
      supabase.from('school_exam_class_textbooks').select('class_id, grade, publisher_author'),
    ])
    if (wsErr) {
      setError('시험지 목록을 불러오지 못했습니다: ' + wsErr.message)
      return
    }
    setWorksheets(wsRows)
    setClasses(classRows ?? [])
    setMappings(mapRows ?? [])
  }

  useEffect(() => {
    reload()
  }, [])

  async function toggleHidden(w) {
    const { error: updErr } = await supabase.from('school_exam_worksheets').update({ is_hidden: !w.is_hidden }).eq('id', w.id)
    if (updErr) {
      showToast('처리 실패: ' + updErr.message, 'error')
      return
    }
    showToast(w.is_hidden ? '시험지를 다시 공개했습니다.' : '시험지를 숨겼습니다.')
    reload()
  }

  const grades = useMemo(() => ['전체', ...new Set((worksheets ?? []).map((w) => w.grade))], [worksheets])

  const filtered = (worksheets ?? []).filter((w) => {
    if (gradeFilter !== '전체' && w.grade !== gradeFilter) return false
    if (!search) return true
    const hay = `${w.unit_name ?? ''} ${w.worksheet_type ?? ''} ${w.publisher_author ?? ''}`
    return hay.includes(search)
  })

  return (
    <div>
      <PageHeader
        title="내신 시험지"
        subtitle={`시험지 ${worksheets?.length ?? '-'}개 · 반별 교과서 매핑에 맞춰 학생에게 노출됩니다`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 13, colorScheme: 'light' }}
            >
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <Input type="text" placeholder="단원/시험지종류 검색" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
          </div>
        }
      />

      <PageError>{error}</PageError>
      {!worksheets && !error && <PageLoading />}

      {worksheets && (
        <TableCard>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg }}>
                <Th>학년</Th>
                <Th>단원</Th>
                <Th>교과서</Th>
                <Th>시험지종류</Th>
                <Th>문항수</Th>
                <Th>공개상태</Th>
                <th style={{ padding: '12px 20px' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <Tr key={w.id}>
                  <Td>{w.grade}</Td>
                  <Td>{w.unit_name}</Td>
                  <Td style={{ color: T.inkMuted }}>{w.publisher_author}</Td>
                  <Td>{w.worksheet_type}</Td>
                  <Td>{w.school_exam_questions?.[0]?.count ?? 0}</Td>
                  <Td>
                    <StatusBadge positive={!w.is_hidden}>{w.is_hidden ? '숨김' : '공개'}</StatusBadge>
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    <SmallButton onClick={() => toggleHidden(w)}>{w.is_hidden ? '공개하기' : '숨기기'}</SmallButton>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: T.inkFaint, fontSize: 13 }}>
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>
      )}

      <div style={{ marginTop: 28 }}>
        <PageHeader title="반별 교과서 매핑" subtitle="반에 매핑을 지정하면 그 교과서 시험지만 학생에게 보입니다. 매핑이 없으면 전체 시험지가 보입니다." />
        <ClassTextbookTable classes={classes} mappings={mappings} onChanged={reload} showToast={showToast} />
      </div>
    </div>
  )
}

function ClassTextbookTable({ classes, mappings, onChanged, showToast }) {
  const mapByClass = useMemo(() => Object.fromEntries(mappings.map((m) => [m.class_id, m])), [mappings])
  const [draft, setDraft] = useState({})

  function fieldFor(classId, key, fallback) {
    if (draft[classId]?.[key] !== undefined) return draft[classId][key]
    return mapByClass[classId]?.[key] ?? fallback
  }

  function setField(classId, key, value) {
    setDraft((prev) => ({ ...prev, [classId]: { ...prev[classId], [key]: value } }))
  }

  async function save(classId) {
    const grade = fieldFor(classId, 'grade', '')
    const publisher = fieldFor(classId, 'publisher_author', '')
    if (!grade || !publisher) {
      showToast('학년과 출판사/저자를 모두 입력해주세요.', 'error')
      return
    }
    const { error: upErr } = await supabase.from('school_exam_class_textbooks').upsert({ class_id: classId, grade, publisher_author: publisher })
    if (upErr) {
      showToast('저장 실패: ' + upErr.message, 'error')
      return
    }
    showToast('저장되었습니다.')
    setDraft((prev) => ({ ...prev, [classId]: undefined }))
    onChanged()
  }

  async function clear(classId) {
    const { error: delErr } = await supabase.from('school_exam_class_textbooks').delete().eq('class_id', classId)
    if (delErr) {
      showToast('삭제 실패: ' + delErr.message, 'error')
      return
    }
    showToast('매핑을 해제했습니다. 이제 전체 시험지가 노출됩니다.')
    onChanged()
  }

  return (
    <TableCard>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: T.bg }}>
            <Th>반</Th>
            <Th>학년</Th>
            <Th>출판사/저자</Th>
            <th style={{ padding: '12px 20px' }} />
          </tr>
        </thead>
        <tbody>
          {classes.map((c) => {
            const hasMapping = !!mapByClass[c.id]
            return (
              <Tr key={c.id}>
                <Td style={{ fontWeight: 700, color: T.ink }}>{c.name}</Td>
                <Td>
                  <Input
                    type="text"
                    value={fieldFor(c.id, 'grade', '')}
                    onChange={(e) => setField(c.id, 'grade', e.target.value)}
                    placeholder="예: 중2"
                    style={{ width: 110 }}
                  />
                </Td>
                <Td>
                  <Input
                    type="text"
                    value={fieldFor(c.id, 'publisher_author', '')}
                    onChange={(e) => setField(c.id, 'publisher_author', e.target.value)}
                    placeholder="예: 동아, 윤정미"
                    style={{ width: 180 }}
                  />
                </Td>
                <Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <SmallButton onClick={() => save(c.id)} style={{ marginRight: 6 }}>
                    저장
                  </SmallButton>
                  {hasMapping && <SmallButton onClick={() => clear(c.id)}>해제</SmallButton>}
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </table>
    </TableCard>
  )
}
