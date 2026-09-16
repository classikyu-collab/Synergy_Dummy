import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STATUS_COLORS, classifyStatus, todayStr } from '../lib/statusColors'
import { PARENT_THEME as THEME } from '../lib/theme'

function StatusBadge({ label, isDone }) {
  const kind = classifyStatus(label, isDone)
  const c = STATUS_COLORS[kind]
  return (
    <span
      style={{
        fontSize: 14,
        fontWeight: 600,
        padding: '5px 12px',
        borderRadius: 999,
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {label ?? '미체크'}
    </span>
  )
}

function pinStorageKey(studentId) {
  return `synapse_parent_pin_${studentId}`
}

function PinGate({ studentId, onVerified }) {
  const [stage, setStage] = useState('checking') // checking | enter | change | error
  const [pin, setPin] = useState('')
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPin2, setNewPin2] = useState('')
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function checkStored() {
      const stored = localStorage.getItem(pinStorageKey(studentId))
      if (!stored) {
        if (!cancelled) setStage('enter')
        return
      }
      const { data, error: err } = await supabase.rpc('verify_parent_pin', { p_student_id: studentId, p_pin: stored })
      if (cancelled) return
      const row = data?.[0]
      if (err || !row?.ok) {
        localStorage.removeItem(pinStorageKey(studentId))
        setStage('enter')
        return
      }
      if (row.must_change) {
        setOldPin(stored)
        setStage('change')
        return
      }
      onVerified(stored)
    }
    checkStored()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  async function handleEnterSubmit(e) {
    e.preventDefault()
    setMsg('')
    setSubmitting(true)
    const { data, error: err } = await supabase.rpc('verify_parent_pin', { p_student_id: studentId, p_pin: pin })
    setSubmitting(false)
    const row = data?.[0]
    if (err || !row?.ok) {
      setMsg('PIN이 올바르지 않습니다.')
      return
    }
    if (row.must_change) {
      setOldPin(pin)
      setStage('change')
      return
    }
    localStorage.setItem(pinStorageKey(studentId), pin)
    onVerified(pin)
  }

  async function handleChangeSubmit(e) {
    e.preventDefault()
    setMsg('')
    if (!/^[0-9]{4}$/.test(newPin)) {
      setMsg('새 PIN은 숫자 4자리로 입력해주세요.')
      return
    }
    if (newPin !== newPin2) {
      setMsg('새 PIN이 서로 일치하지 않습니다.')
      return
    }
    setSubmitting(true)
    const { data: ok, error: err } = await supabase.rpc('set_parent_pin', { p_student_id: studentId, p_old_pin: oldPin, p_new_pin: newPin })
    setSubmitting(false)
    if (err || !ok) {
      setMsg('PIN 변경에 실패했습니다.')
      return
    }
    localStorage.setItem(pinStorageKey(studentId), newPin)
    onVerified(newPin)
  }

  if (stage === 'checking') {
    return <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>불러오는 중...</div>
  }

  const boxStyle = { maxWidth: 340, margin: '60px auto', fontFamily: "'Noto Sans KR', -apple-system, sans-serif", padding: '0 20px' }
  const inputStyle = { width: '100%', padding: '12px 14px', fontSize: 16, letterSpacing: 4, textAlign: 'center', border: '1px solid #dcece9', borderRadius: 12, boxSizing: 'border-box', marginBottom: 10, colorScheme: 'light' }

  if (stage === 'change') {
    return (
      <div style={boxStyle}>
        <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>PIN 변경이 필요합니다</p>
        <p style={{ fontSize: 13, color: '#7c8f8c', marginBottom: 16 }}>처음 이용하시는군요. 앞으로 사용하실 4자리 PIN을 설정해주세요.</p>
        <form onSubmit={handleChangeSubmit}>
          <input type="text" inputMode="numeric" maxLength={4} placeholder="새 PIN 4자리" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} style={inputStyle} required />
          <input type="text" inputMode="numeric" maxLength={4} placeholder="새 PIN 확인" value={newPin2} onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ''))} style={inputStyle} required />
          {msg && <p style={{ color: 'red', fontSize: 12.5 }}>{msg}</p>}
          <button type="submit" disabled={submitting} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#0d9488', color: '#fff', fontWeight: 700, fontSize: 15 }}>
            {submitting ? '설정 중...' : 'PIN 설정하기'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={boxStyle}>
      <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>PIN 입력</p>
      <p style={{ fontSize: 13, color: '#7c8f8c', marginBottom: 16 }}>자녀 정보 보호를 위해 4자리 PIN이 필요합니다. 처음이시라면 초기 PIN(0000)을 입력해주세요.</p>
      <form onSubmit={handleEnterSubmit}>
        <input type="text" inputMode="numeric" maxLength={4} placeholder="PIN 4자리" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} style={inputStyle} autoFocus required />
        {msg && <p style={{ color: 'red', fontSize: 12.5 }}>{msg}</p>}
        <button type="submit" disabled={submitting} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#0d9488', color: '#fff', fontWeight: 700, fontSize: 15 }}>
          {submitting ? '확인 중...' : '확인'}
        </button>
      </form>
      <Link to="/parent" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 12.5, color: '#7c8f8c' }}>
        ← 다시 검색하기
      </Link>
    </div>
  )
}

export default function ParentDetail() {
  const { studentId } = useParams()
  const [verifiedPin, setVerifiedPin] = useState(null)
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState(null)
  const [nextMakeup, setNextMakeup] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!verifiedPin) return
    let cancelled = false
    async function load() {
      const [{ data: profileRows, error: profileErr }, { data: itemRows, error: itemErr }, { data: makeupDate }] = await Promise.all([
        supabase.rpc('get_parent_profile', { p_student_id: studentId, p_pin: verifiedPin }),
        supabase.rpc('get_parent_coaching_items', { p_student_id: studentId, p_pin: verifiedPin }),
        supabase.rpc('get_parent_next_makeup', { p_student_id: studentId, p_pin: verifiedPin }),
      ])
      if (cancelled) return
      if (profileErr || itemErr || !profileRows?.length) {
        setError('학생 정보를 불러오지 못했습니다.')
        return
      }
      setProfile(profileRows[0])
      setItems(itemRows)
      setNextMakeup(makeupDate ?? null)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [studentId, verifiedPin])

  if (!verifiedPin) {
    return <PinGate studentId={studentId} onVerified={setVerifiedPin} />
  }

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Link to="/parent">← 다시 검색하기</Link>
      </div>
    )
  }
  if (!profile) {
    return <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>불러오는 중...</div>
  }

  const today = todayStr()
  const todayItems = items.filter((it) => it.date === today)
  const resolved = todayItems.filter((it) => it.is_done).length
  const total = todayItems.length
  const pct = total ? Math.round((resolved / total) * 100) : 0

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 520,
        margin: '0 auto',
        background: THEME.bg,
        fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
        color: THEME.ink,
        minHeight: '100vh',
      }}
    >
      <div style={{ position: 'relative', background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`, color: '#fff', padding: '22px 20px 26px', borderRadius: '0 0 28px 28px' }}>
        <Link
          to="/parent"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            color: 'rgba(255,255,255,0.85)',
            background: 'rgba(255,255,255,0.16)',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          다시 검색
        </Link>
        <p style={{ fontSize: 19, fontWeight: 700, margin: '0 40px 4px 0', lineHeight: 1.4 }}>{profile.name} 학생 학부모님, 안녕하세요.</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: 0 }}>학습 결과는 수업 다음날 오후 6시부터 확인하실 수 있어요.</p>
      </div>

      <div style={{ padding: '18px 16px 28px' }}>
        <div
          style={{
            background: '#fff',
            border: `1px solid ${THEME.primaryDark}22`,
            borderRadius: 20,
            padding: '14px 16px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 4px 14px -10px rgba(20,80,75,0.16)',
          }}
        >
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: THEME.inkMuted }}>
            {profile.class_name} · {profile.difficulty_tier ?? '레벨 미지정'}
          </p>
        </div>

        {nextMakeup && (
          <div
            style={{
              background: '#fff',
              border: `1px solid ${THEME.makeup.border}`,
              borderRadius: 20,
              padding: '14px 16px',
              marginBottom: 18,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              boxShadow: '0 4px 14px -10px rgba(20,80,75,0.16)',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: THEME.makeup.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={THEME.makeup.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4" />
                <path d="M8 2v4" />
                <path d="M3 10h18" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: THEME.makeup.text, margin: '0 0 2px' }}>보강 예정</p>
              <p style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>{nextMakeup}</p>
            </div>
          </div>
        )}

        {total > 0 && (
          <div
            style={{
              background: '#fff',
              border: '1px solid #dcece9',
              borderRadius: 20,
              padding: '14px 16px',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: '0 4px 14px -10px rgba(20,80,75,0.16)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                flexShrink: 0,
                background: `conic-gradient(${THEME.primary} calc(${pct} * 1%), #e3efed 0)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 5,
              }}
            >
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: THEME.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800, color: '#fff' }}>
                {resolved}/{total}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>오늘 {resolved}개 완료했어요</p>
              <p style={{ fontSize: 12.5, color: THEME.inkMuted, margin: '3px 0 0' }}>{total - resolved}개 남았어요</p>
            </div>
          </div>
        )}

        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>오늘 결과</p>
        {total === 0 && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>오늘 등록된 항목이 없습니다.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 22 }}>
          {todayItems.map((it) => (
            <div
              key={it.item_id}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 14,
                borderLeft: `4px solid ${it.item_type === '시험' ? THEME.examBorder : THEME.primary}`,
                boxShadow: '0 4px 14px -8px rgba(20,80,75,0.18)',
              }}
            >
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: it.item_type === '시험' ? '#fdeee3' : '#e6f7f5',
                    color: it.item_type === '시험' ? '#b8571f' : THEME.primaryDark,
                  }}
                >
                  {it.item_type}
                </span>
              </div>
              <p style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.35, margin: '0 0 10px' }}>
                {it.name}
                {it.page ? ` (p.${it.page})` : ''}
              </p>
              <StatusBadge label={it.status_label} isDone={it.is_done} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
