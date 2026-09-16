import { useEffect, useState } from 'react'
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
  TwoColTables,
  Field,
  Input,
  Select,
  ModalWrap,
  ModalTitle,
  InlineError,
  PageHeader,
  PageLoading,
  PageError,
} from '../lib/adminUI'

const CLASS_TYPE_OPTIONS = ['정규반', '내신반']

export default function AdminClassList() {
  const showToast = useToast()
  const [classes, setClasses] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [sortKey, setSortKey] = useState(null) // 'name' | 'teacher'
  const [sortDir, setSortDir] = useState('asc')

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedClasses = classes
    ? [...classes].sort((a, b) => {
        if (!sortKey) return 0
        const av = sortKey === 'name' ? a.name : a.teachers?.name ?? ''
        const bv = sortKey === 'name' ? b.name : b.teachers?.name ?? ''
        const cmp = av.localeCompare(bv, 'ko')
        return sortDir === 'asc' ? cmp : -cmp
      })
    : null

  async function reload() {
    const { data, error: fetchErr } = await supabase
      .from('classes')
      .select('id, name, class_type, status, homeroom_teacher_id, teachers(name), students(count)')
      .order('name')
    if (fetchErr) {
      setError('반 목록을 불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setClasses(data)
  }

  async function loadTeachers() {
    const { data } = await supabase
      .from('teachers')
      .select('id, name, legacy_id, role')
      .eq('status', '재직')
      .order('name')
    setTeachers(data ?? [])
  }

  useEffect(() => {
    reload()
    loadTeachers()
  }, [])

  return (
    <div>
      <PageHeader
        title="반 관리"
        subtitle="전체 반 정보와 담임 배정을 관리합니다."
        action={<PrimaryButton onClick={() => setCreating(true)}>+ 새 반 만들기</PrimaryButton>}
      />

      <PageError>{error}</PageError>
      {!classes && !error && <PageLoading />}

      {classes && (
        <TwoColTables
          items={sortedClasses}
          renderTable={(half) => (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafaff' }}>
                  <Th sort={sortKey === 'name' ? sortDir : null} onClick={() => toggleSort('name')}>
                    반 이름
                  </Th>
                  <Th w={90}>유형</Th>
                  <Th w={90} sort={sortKey === 'teacher' ? sortDir : null} onClick={() => toggleSort('teacher')}>
                    담임
                  </Th>
                  <Th w={60}>학생</Th>
                  <Th w={70}>상태</Th>
                  <th style={{ padding: '12px 20px' }} />
                </tr>
              </thead>
              <tbody>
                {half.map((c) => (
                  <Tr key={c.id}>
                    <Td style={{ fontWeight: 700, color: T.ink }}>{c.name}</Td>
                    <Td>{c.class_type}</Td>
                    <Td>{c.teachers?.name ?? <span style={{ color: T.inkFaint }}>미배정</span>}</Td>
                    <Td>{c.students?.[0]?.count ?? 0}명</Td>
                    <Td>
                      <StatusBadge positive={c.status === '운영중'}>{c.status}</StatusBadge>
                    </Td>
                    <Td style={{ textAlign: 'right' }}>
                      <SmallButton onClick={() => setEditing(c)}>수정</SmallButton>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          )}
        />
      )}

      {creating && (
        <ClassModal
          title="새 반 만들기"
          teachers={teachers}
          onClose={() => setCreating(false)}
          onDone={(msg) => {
            setCreating(false)
            showToast(msg)
            reload()
          }}
        />
      )}

      {editing && (
        <ClassModal
          title="반 정보 수정"
          cls={editing}
          teachers={teachers}
          onClose={() => setEditing(null)}
          onDone={(msg) => {
            setEditing(null)
            showToast(msg)
            reload()
          }}
        />
      )}
    </div>
  )
}

function ClassModal({ title, cls, teachers, onClose, onDone }) {
  const [name, setName] = useState(cls?.name ?? '')
  const [classType, setClassType] = useState(cls?.class_type ?? '정규반')
  const [status, setStatus] = useState(cls?.status ?? '운영중')
  const [homeroomTeacherId, setHomeroomTeacherId] = useState(cls?.homeroom_teacher_id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setSubmitting(true)
    const payload = {
      name,
      class_type: classType,
      status,
      homeroom_teacher_id: homeroomTeacherId || null,
    }
    const query = cls ? supabase.from('classes').update(payload).eq('id', cls.id) : supabase.from('classes').insert(payload)
    const { error: dbErr } = await query
    setSubmitting(false)
    if (dbErr) {
      setLocalError((cls ? '저장 실패: ' : '등록 실패: ') + dbErr.message)
      return
    }
    onDone(cls ? `${name} 정보가 수정되었습니다.` : `${name} 반이 생성되었습니다.`)
  }

  return (
    <ModalWrap onClose={onClose}>
      <ModalTitle>{title}</ModalTitle>
      <InlineError>{localError}</InlineError>
      <form onSubmit={handleSubmit}>
        <Field label="반 이름">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 동백고2-B" required />
        </Field>
        <Field label="반 유형">
          <Select value={classType} onChange={(e) => setClassType(e.target.value)}>
            {CLASS_TYPE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="담임 배정">
          <Select value={homeroomTeacherId} onChange={(e) => setHomeroomTeacherId(e.target.value)}>
            <option value="">미배정</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.legacy_id})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="상태">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="운영중">운영중</option>
            <option value="폐강">폐강</option>
          </Select>
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
            취소
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? '저장 중...' : cls ? '저장' : '만들기'}
          </PrimaryButton>
        </div>
      </form>
    </ModalWrap>
  )
}
