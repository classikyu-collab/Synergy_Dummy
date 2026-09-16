import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { useToast } from '../lib/toast'
import { Th, Td, Tr, StatusBadge, SmallButton, PrimaryButton, Input, PageHeader, PageLoading, PageError, EmptyState, TwoColTables } from '../lib/adminUI'

export default function AdminParentList() {
  const showToast = useToast()
  const [students, setStudents] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [resettingId, setResettingId] = useState(null)

  async function reload() {
    const { data, error: fetchErr } = await supabase
      .from('students')
      .select('id, name, classes(name), parent_must_change_pin')
      .eq('status', '재원')
      .order('name')
    if (fetchErr) {
      setError('학생 목록을 불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setStudents(data)
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleReset(s) {
    if (!confirm(`${s.name} 학부모 PIN을 0000으로 초기화할까요?`)) return
    setResettingId(s.id)
    const { data, error: fnErr } = await supabase.rpc('admin_reset_parent_pin', { p_student_id: s.id })
    setResettingId(null)
    if (fnErr || !data) {
      showToast('초기화 실패: ' + (fnErr?.message ?? '알 수 없는 오류'), 'error')
      return
    }
    showToast(`${s.name} 학부모 PIN이 0000으로 초기화되었습니다.`)
    reload()
  }

  const filtered = students?.filter((s) => s.name.includes(search)) ?? null
  const parentUrl = `${window.location.origin}/parent`

  return (
    <div>
      <PageHeader title="학부모 관리" subtitle="학부모 접속 링크와 4자리 PIN을 관리합니다." />

      <div
        style={{
          background: T.primaryTint,
          border: `1px solid ${T.primary}33`,
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 12.5, fontWeight: 700, color: T.primaryDark }}>학부모 공용 접속 링크</p>
          <p style={{ margin: 0, fontSize: 13.5, fontFamily: 'monospace', color: T.ink }}>{parentUrl}</p>
        </div>
        <PrimaryButton
          style={{ flexShrink: 0 }}
          onClick={() => {
            navigator.clipboard?.writeText(parentUrl)
            showToast('링크가 복사되었습니다.')
          }}
        >
          링크 복사
        </PrimaryButton>
      </div>
      <p style={{ margin: '-12px 0 20px', fontSize: 12.5, color: T.inkFaint }}>
        전체 학부모에게 이 링크 하나만 전달하면 됩니다. 학부모는 자녀 이름 검색 후 4자리 PIN을 입력해서 접속합니다 (최초 PIN: 0000, 최초 접속 시 새 PIN 설정 요구).
      </p>

      <div style={{ marginBottom: 16 }}>
        <Input type="text" placeholder="학생 이름 검색" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
      </div>

      <PageError>{error}</PageError>
      {!filtered && !error && <PageLoading />}

      {filtered && filtered.length === 0 && <EmptyState>검색 결과가 없습니다.</EmptyState>}

      {filtered && filtered.length > 0 && (
        <TwoColTables
          items={filtered}
          renderTable={(half) => (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafaff' }}>
                  <Th>학생</Th>
                  <Th>반</Th>
                  <Th>PIN 상태</Th>
                  <th style={{ padding: '12px 20px' }} />
                </tr>
              </thead>
              <tbody>
                {half.map((s) => (
                  <Tr key={s.id}>
                    <Td style={{ fontWeight: 700, color: T.ink }}>{s.name}</Td>
                    <Td>{s.classes?.name ?? <span style={{ color: T.inkFaint }}>미배정</span>}</Td>
                    <Td>
                      <StatusBadge positive={!s.parent_must_change_pin}>{s.parent_must_change_pin ? '0000 (변경 필요)' : '설정함'}</StatusBadge>
                    </Td>
                    <Td style={{ textAlign: 'right' }}>
                      <SmallButton onClick={() => handleReset(s)} disabled={resettingId === s.id}>
                        {resettingId === s.id ? '처리 중...' : '초기화'}
                      </SmallButton>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          )}
        />
      )}
    </div>
  )
}
