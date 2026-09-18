import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { Select, Input, ModalWrap, ModalTitle, InlineError, InlineSuccess, GhostButton, PrimaryButton } from '../lib/adminUI'

export const UNASSIGNED = '__unassigned__'

function useClassStudents(classId, reloadToken) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let q = supabase.from('students').select('id, name').eq('status', '재원').order('name')
      q = classId && classId !== UNASSIGNED ? q.eq('class_id', classId) : q.is('class_id', null)
      const { data } = await q
      if (!cancelled) {
        setList(data ?? [])
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [classId, reloadToken])

  return [list, loading]
}

function ListBox({ children }) {
  return <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, height: 260, overflowY: 'auto', background: T.bg }}>{children}</div>
}

// 학생 관리 페이지의 "일괄 반 배정"과, 시간표 관리의 반 카드 "학생 배정" 버튼이 함께 쓰는 공용 모달.
// initialSourceClassId를 넘기면 1번 구역(반에서 데려올 학생)이, initialTargetClassId를 넘기면 3번 구역(반으로 데려갈 곳)이
// 그 반으로 미리 선택된 채 열린다 — 시간표 화면에서 "학생 배정"을 누르면 보통 그 반으로 학생을 불러들이는 경우가 많아 후자를 쓴다.
export default function BulkAssignModal({ classes, initialSourceClassId, initialTargetClassId, onClose, onDone }) {
  const [sourceClassId, setSourceClassId] = useState(initialSourceClassId ?? UNASSIGNED)
  const [targetClassId, setTargetClassId] = useState(initialTargetClassId ?? UNASSIGNED)
  const [selectedMap, setSelectedMap] = useState(new Map()) // id -> { id, name, className }
  const [reloadToken, setReloadToken] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')
  const [localMessage, setLocalMessage] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const [sourceStudents, loadingSource] = useClassStudents(sourceClassId, reloadToken)
  const [targetStudents, loadingTarget] = useClassStudents(targetClassId, reloadToken)

  const sourceClassName = sourceClassId === UNASSIGNED ? '미배정' : classes.find((c) => c.id === sourceClassId)?.name
  const targetClassName = targetClassId === UNASSIGNED ? '미배정' : classes.find((c) => c.id === targetClassId)?.name

  useEffect(() => {
    if (!nameQuery.trim()) {
      setSearchResults(null)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('students')
        .select('id, name, classes(name)')
        .eq('status', '재원')
        .ilike('name', `%${nameQuery.trim()}%`)
        .order('name')
        .limit(30)
      if (cancelled) return
      setSearchResults(data ?? [])
      setSearching(false)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [nameQuery])

  function toggle(student, className) {
    setSelectedMap((prev) => {
      const next = new Map(prev)
      if (next.has(student.id)) {
        next.delete(student.id)
      } else {
        next.set(student.id, { id: student.id, name: student.name, className })
      }
      return next
    })
  }

  const selectedList = Array.from(selectedMap.values())

  async function handleApply(closeAfter) {
    if (selectedMap.size === 0) return
    setLocalError('')
    setLocalMessage('')
    setSubmitting(true)
    const ids = Array.from(selectedMap.keys())
    const { error: dbErr } = await supabase
      .from('students')
      .update({ class_id: targetClassId === UNASSIGNED ? null : targetClassId })
      .in('id', ids)
    setSubmitting(false)
    if (dbErr) {
      setLocalError('반 배정 실패: ' + dbErr.message)
      return
    }
    const msg = `${ids.length}명이 ${targetClassName}(으)로 반 배정되었습니다.`
    if (closeAfter) {
      onDone(msg)
      return
    }
    setSelectedMap(new Map())
    setReloadToken((t) => t + 1)
    setNameQuery('')
    setLocalMessage(msg)
  }

  return (
    <ModalWrap onClose={onClose} width={960}>
      <ModalTitle>일괄 반 배정</ModalTitle>
      <InlineError>{localError}</InlineError>
      <InlineSuccess>{localMessage}</InlineSuccess>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 700, color: T.inkMuted }}>1. 반 선택 또는 이름 검색 — 학생 목록</p>
          <Select value={sourceClassId} onChange={(e) => setSourceClassId(e.target.value)} style={{ marginBottom: 6 }}>
            <option value={UNASSIGNED}>미배정</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            type="text"
            placeholder="학생 이름 검색 (전체 반 대상)"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {searchResults === null ? (
            <ListBox>
              {loadingSource && <p style={{ padding: 12, fontSize: 12.5, color: T.inkFaint }}>불러오는 중...</p>}
              {!loadingSource && sourceStudents.length === 0 && <p style={{ padding: 12, fontSize: 12.5, color: T.inkFaint }}>학생이 없습니다.</p>}
              {sourceStudents.map((s) => (
                <label key={s.id} className="admin-list-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}>
                  <input type="checkbox" checked={selectedMap.has(s.id)} onChange={() => toggle(s, sourceClassName)} />
                  {s.name}
                </label>
              ))}
            </ListBox>
          ) : (
            <ListBox>
              {searching && <p style={{ padding: 12, fontSize: 12.5, color: T.inkFaint }}>검색 중...</p>}
              {!searching && searchResults.length === 0 && <p style={{ padding: 12, fontSize: 12.5, color: T.inkFaint }}>검색 결과가 없습니다.</p>}
              {searchResults.map((s) => (
                <label key={s.id} className="admin-list-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}>
                  <input type="checkbox" checked={selectedMap.has(s.id)} onChange={() => toggle(s, s.classes?.name ?? '미배정')} />
                  {s.name}
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, color: T.inkFaint }}>{s.classes?.name ?? '미배정'}</span>
                </label>
              ))}
            </ListBox>
          )}
        </div>

        <div>
          <p style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 700, color: T.inkMuted }}>2. 선택 학생 ({selectedList.length}명) — 이전 반</p>
          <ListBox>
            {selectedList.length === 0 && <p style={{ padding: 12, fontSize: 12.5, color: T.inkFaint }}>왼쪽 목록에서 학생을 선택해주세요. (여러 반을 오가며 선택 가능)</p>}
            {selectedList.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', fontSize: 13, borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontWeight: 700, color: T.ink }}>{s.name}</span>
                <span style={{ fontSize: 12, color: T.inkFaint }}>{s.className}</span>
              </div>
            ))}
          </ListBox>
        </div>

        <div>
          <p style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 700, color: T.inkMuted }}>3. 옮길 반 선택 — 현재 소속 학생</p>
          <Select value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)} style={{ marginBottom: 8 }}>
            <option value={UNASSIGNED}>미배정</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <ListBox>
            {loadingTarget && <p style={{ padding: 12, fontSize: 12.5, color: T.inkFaint }}>불러오는 중...</p>}
            {!loadingTarget && targetStudents.length === 0 && <p style={{ padding: 12, fontSize: 12.5, color: T.inkFaint }}>학생이 없습니다.</p>}
            {targetStudents.map((s) => (
              <div key={s.id} style={{ padding: '8px 12px', fontSize: 13, color: T.inkMuted, borderBottom: `1px solid ${T.border}` }}>
                {s.name}
              </div>
            ))}
          </ListBox>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
          취소
        </GhostButton>
        <GhostButton type="button" disabled={submitting || selectedMap.size === 0} onClick={() => handleApply(false)} style={{ flex: 1, fontWeight: 700, opacity: selectedMap.size === 0 ? 0.5 : 1 }}>
          {submitting ? '적용 중...' : '적용 (계속 작업)'}
        </GhostButton>
        <PrimaryButton type="button" disabled={submitting || selectedMap.size === 0} onClick={() => handleApply(true)} style={{ flex: 1, opacity: selectedMap.size === 0 ? 0.5 : 1 }}>
          {submitting ? '처리 중...' : selectedMap.size > 0 ? `확인 (${selectedMap.size}명 → ${targetClassName})` : '학생을 선택해주세요'}
        </PrimaryButton>
      </div>
    </ModalWrap>
  )
}
