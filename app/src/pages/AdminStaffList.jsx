import { useEffect, useState } from 'react'
import { supabase, invokeFn } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { useToast } from '../lib/toast'
import {
  Th,
  Td,
  Tr,
  Badge,
  StatusBadge,
  SmallButton,
  PrimaryButton,
  GhostButton,
  DangerButton,
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

const ROLE_LABEL = { coach: '코칭쌤', homeroom_teacher: '담임강사', admin: '시스템관리자' }
const ROLE_OPTIONS = Object.entries(ROLE_LABEL)

export default function AdminStaffList() {
  const showToast = useToast()
  const [teachers, setTeachers] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null) // teacher object or null

  async function reload() {
    const { data, error: fetchErr } = await supabase
      .from('teachers')
      .select('id, legacy_id, name, role, status, is_master, must_change_password')
      .order('legacy_id')
    if (fetchErr) {
      setError('직원 목록을 불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setTeachers(data)
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div>
      <PageHeader
        title="직원 계정"
        subtitle="전체 담임강사·코칭쌤·관리자 계정을 관리합니다."
        action={<PrimaryButton onClick={() => setCreating(true)}>+ 직원 등록</PrimaryButton>}
      />

      <PageError>{error}</PageError>
      {!teachers && !error && <PageLoading />}

      {teachers && (
        <TwoColTables
          items={teachers}
          renderTable={(half, i) => (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafaff' }}>
                  <Th>아이디</Th>
                  <Th>이름</Th>
                  <Th w={110}>역할</Th>
                  <Th w={70}>재직</Th>
                  <th style={{ padding: '12px 20px' }} />
                </tr>
              </thead>
              <tbody>
                {half.map((t) => (
                  <Tr key={t.id}>
                    <Td>{t.legacy_id}</Td>
                    <Td style={{ fontWeight: 700 }}>
                      {t.name}
                      {t.must_change_password && (
                        <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: T.danger.text, marginTop: 2 }}>
                          비밀번호 변경 필요
                        </span>
                      )}
                    </Td>
                    <Td>
                      <Badge bg={T.primaryTint} color={T.primaryDark}>
                        {ROLE_LABEL[t.role] ?? t.role}
                      </Badge>
                    </Td>
                    <Td>
                      <StatusBadge positive={t.status === '재직'}>{t.status}</StatusBadge>
                    </Td>
                    <Td style={{ textAlign: 'right' }}>
                      <SmallButton onClick={() => setEditing(t)}>수정</SmallButton>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          )}
        />
      )}

      {creating && (
        <CreateStaffModal
          onClose={() => setCreating(false)}
          onCreated={(msg) => {
            setCreating(false)
            showToast(msg)
            reload()
          }}
        />
      )}

      {editing && (
        <EditStaffModal
          teacher={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null)
            showToast(msg)
            reload()
          }}
        />
      )}
    </div>
  )
}

function CreateStaffModal({ onClose, onCreated }) {
  const [legacyId, setLegacyId] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('coach')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!legacyId || !name) return
    setLocalError('')
    setSubmitting(true)
    const { message } = await invokeFn('admin-create-staff', { legacyId, name, role })
    setSubmitting(false)
    if (message) {
      setLocalError('등록 실패: ' + message)
      return
    }
    onCreated(`${name}(${legacyId}) 계정이 생성되었습니다. 초기 비밀번호: 123456`)
  }

  return (
    <ModalWrap onClose={onClose}>
      <ModalTitle>직원 등록</ModalTitle>
      <InlineError>{localError}</InlineError>
      <form onSubmit={handleSubmit}>
        <Field label="아이디 (로그인용)">
          <Input value={legacyId} onChange={(e) => setLegacyId(e.target.value)} placeholder="예: kimcoach" required />
        </Field>
        <Field label="이름">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="역할">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
            취소
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? '등록 중...' : '등록'}
          </PrimaryButton>
        </div>
      </form>
    </ModalWrap>
  )
}

function EditStaffModal({ teacher, onClose, onSaved }) {
  const [legacyId, setLegacyId] = useState(teacher.legacy_id)
  const [name, setName] = useState(teacher.name)
  const [role, setRole] = useState(teacher.role)
  const [status, setStatus] = useState(teacher.status)
  const [isMaster, setIsMaster] = useState(teacher.is_master)
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [settingPassword, setSettingPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [localError, setLocalError] = useState('')

  function fail(msg) {
    setLocalError(msg)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setSubmitting(true)
    const { message } = await invokeFn('admin-update-staff', { teacherId: teacher.id, legacyId, name, role, status, isMaster })
    setSubmitting(false)
    if (message) {
      fail('저장 실패: ' + message)
      return
    }
    onSaved(`${name}(${legacyId}) 정보가 수정되었습니다.`)
  }

  async function handleReset() {
    if (!confirm(`${teacher.name}(${teacher.legacy_id}) 비밀번호를 123456으로 초기화할까요?`)) return
    setLocalError('')
    setResetting(true)
    const { message } = await invokeFn('admin-reset-password', { teacherId: teacher.id })
    setResetting(false)
    if (message) {
      fail('초기화 실패: ' + message)
      return
    }
    onSaved(`${teacher.name}(${teacher.legacy_id}) 비밀번호가 123456으로 초기화되었습니다.`)
  }

  async function handleSetPassword() {
    if (!newPassword) return
    setLocalError('')
    setSettingPassword(true)
    const { message } = await invokeFn('admin-set-staff-password', { teacherId: teacher.id, password: newPassword })
    setSettingPassword(false)
    if (message) {
      fail('비밀번호 변경 실패: ' + message)
      return
    }
    setNewPassword('')
    onSaved(`${teacher.name}(${teacher.legacy_id}) 비밀번호가 변경되었습니다.`)
  }

  async function handleDelete() {
    if (!confirm(`${teacher.name}(${teacher.legacy_id}) 계정을 삭제할까요? 담임으로 배정된 반이 있다면 담임 배정도 함께 해제됩니다. 이 작업은 되돌릴 수 없습니다.`))
      return
    setLocalError('')
    setDeleting(true)
    const { data, message } = await invokeFn('admin-delete-staff', { teacherId: teacher.id })
    setDeleting(false)
    if (message) {
      fail('삭제 실패: ' + message)
      return
    }
    const unassigned = data?.unassignedClassNames ?? []
    const suffix = unassigned.length > 0 ? ` (담임 배정 해제된 반: ${unassigned.join(', ')})` : ''
    onSaved(`${teacher.name}(${teacher.legacy_id}) 계정이 삭제되었습니다.${suffix}`)
  }

  return (
    <ModalWrap onClose={onClose}>
      <ModalTitle>직원 정보 수정</ModalTitle>
      <InlineError>{localError}</InlineError>
      <form onSubmit={handleSubmit}>
        <Field label="아이디 (로그인용)">
          <Input value={legacyId} onChange={(e) => setLegacyId(e.target.value)} required />
        </Field>
        <Field label="이름">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="역할">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="재직상태">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="재직">재직</option>
            <option value="퇴사">퇴사</option>
          </Select>
        </Field>
        <Field label="마스터 권한">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.inkMuted, cursor: 'pointer' }}>
            <input type="checkbox" checked={isMaster} onChange={(e) => setIsMaster(e.target.checked)} />
            역할과 무관하게 전체 관리자 권한 부여
          </label>
        </Field>

        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 6, paddingTop: 14 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: T.inkMuted, marginBottom: 6 }}>비밀번호 직접 설정</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6자 이상" />
            <GhostButton type="button" onClick={handleSetPassword} disabled={settingPassword || !newPassword} style={{ padding: '0 14px' }}>
              {settingPassword ? '변경 중...' : '변경'}
            </GhostButton>
          </div>
          <GhostButton type="button" onClick={handleReset} disabled={resetting} style={{ width: '100%' }}>
            {resetting ? '처리 중...' : '비밀번호 초기화 (123456으로)'}
          </GhostButton>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
            취소
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? '저장 중...' : '저장'}
          </PrimaryButton>
        </div>

        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 14 }}>
          <DangerButton type="button" onClick={handleDelete} disabled={deleting}>
            {deleting ? '삭제 중...' : '이 직원 계정 삭제'}
          </DangerButton>
        </div>
      </form>
    </ModalWrap>
  )
}
