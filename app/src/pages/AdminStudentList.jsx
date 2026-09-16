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
  TableCard,
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
import BulkAssignModal from './BulkAssignModal'

const TIER_OPTIONS = ['공통', '발전', '상위']
const STATUS_OPTIONS = ['재원', '휴원', '퇴원']

export default function AdminStudentList() {
  const showToast = useToast()
  const [students, setStudents] = useState(null)
  const [classes, setClasses] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [bulkAssigning, setBulkAssigning] = useState(false)

  async function reload() {
    const { data, error: fetchErr } = await supabase
      .from('students')
      .select('id, name, difficulty_tier, status, class_id, classes(name)')
      .order('name')
    if (fetchErr) {
      setError('학생 목록을 불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setStudents(data)
  }

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('id, name').eq('status', '운영중').order('name')
    setClasses(data ?? [])
  }

  useEffect(() => {
    reload()
    loadClasses()
  }, [])

  const filtered = students?.filter((s) => s.name.includes(search)) ?? null

  return (
    <div>
      <PageHeader
        title="학생 관리"
        subtitle={`재원생 ${students?.filter((s) => s.status === '재원').length ?? '-'}명`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input type="text" placeholder="학생 이름 검색" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
            <GhostButton onClick={() => setBulkAssigning(true)} style={{ padding: '10px 14px' }}>
              일괄 반 배정
            </GhostButton>
            <PrimaryButton onClick={() => setCreating(true)}>+ 학생 등록</PrimaryButton>
          </div>
        }
      />

      <PageError>{error}</PageError>
      {!filtered && !error && <PageLoading />}

      {filtered && (
        <TableCard>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafaff' }}>
                <Th>이름</Th>
                <Th>반</Th>
                <Th>레벨</Th>
                <Th>재원상태</Th>
                <th style={{ padding: '12px 20px' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <Tr key={s.id}>
                  <Td style={{ fontWeight: 700, color: T.ink }}>{s.name}</Td>
                  <Td>{s.classes?.name ?? <span style={{ color: T.inkFaint }}>미배정</span>}</Td>
                  <Td>{s.difficulty_tier}</Td>
                  <Td>
                    <StatusBadge positive={s.status === '재원'}>{s.status}</StatusBadge>
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    <SmallButton onClick={() => setEditing(s)}>수정</SmallButton>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: T.inkFaint, fontSize: 13 }}>
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>
      )}

      {creating && (
        <StudentModal
          title="학생 등록"
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
        <StudentModal
          title="학생 정보 수정"
          student={editing}
          classes={classes}
          onClose={() => setEditing(null)}
          onDone={(msg) => {
            setEditing(null)
            showToast(msg)
            reload()
          }}
        />
      )}

      {bulkAssigning && (
        <BulkAssignModal
          classes={classes}
          onClose={() => setBulkAssigning(false)}
          onDone={(msg) => {
            setBulkAssigning(false)
            showToast(msg)
            reload()
          }}
        />
      )}
    </div>
  )
}

function StudentModal({ title, student, classes, onClose, onDone }) {
  const [name, setName] = useState(student?.name ?? '')
  const [classId, setClassId] = useState(student?.class_id ?? '')
  const [difficultyTier, setDifficultyTier] = useState(student?.difficulty_tier ?? '공통')
  const [status, setStatus] = useState(student?.status ?? '재원')
  const [submitting, setSubmitting] = useState(false)
  const [resettingPin, setResettingPin] = useState(false)
  const [localError, setLocalError] = useState('')

  async function handleResetPin() {
    if (!confirm(`${student.name} 학생 PIN을 0000으로 초기화할까요?`)) return
    setResettingPin(true)
    const { data, error: rpcErr } = await supabase.rpc('admin_reset_student_pin', { p_student_id: student.id })
    setResettingPin(false)
    if (rpcErr || !data) {
      setLocalError('PIN 초기화 실패: ' + (rpcErr?.message ?? '알 수 없는 오류'))
      return
    }
    onDone(`${student.name} 학생 PIN이 0000으로 초기화되었습니다.`)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setSubmitting(true)
    const payload = { name, class_id: classId || null, difficulty_tier: difficultyTier, status }
    const query = student ? supabase.from('students').update(payload).eq('id', student.id) : supabase.from('students').insert(payload)
    const { error: dbErr } = await query
    setSubmitting(false)
    if (dbErr) {
      setLocalError((student ? '저장 실패: ' : '등록 실패: ') + dbErr.message)
      return
    }
    onDone(student ? `${name} 정보가 수정되었습니다.` : `${name} 학생이 등록되었습니다.`)
  }

  return (
    <ModalWrap onClose={onClose}>
      <ModalTitle>{title}</ModalTitle>
      <InlineError>{localError}</InlineError>
      <form onSubmit={handleSubmit}>
        <Field label="이름">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="반">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">미배정</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="레벨">
          <Select value={difficultyTier} onChange={(e) => setDifficultyTier(e.target.value)}>
            {TIER_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="재원상태">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
            취소
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? '저장 중...' : student ? '저장' : '등록'}
          </PrimaryButton>
        </div>
      </form>

      {student && (
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 14 }}>
          <GhostButton type="button" onClick={handleResetPin} disabled={resettingPin} style={{ width: '100%' }}>
            {resettingPin ? '처리 중...' : '학생 PIN 초기화 (0000으로)'}
          </GhostButton>
        </div>
      )}
    </ModalWrap>
  )
}

