import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { PARENT_THEME as THEME } from '../lib/theme'

export function parentPinStorageKey(studentId) {
  return `synapse_parent_pin_${studentId}`
}

export default function ParentPinGate({ studentId, onVerified }) {
  const [stage, setStage] = useState('checking') // checking | enter | change
  const [pin, setPin] = useState('')
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPin2, setNewPin2] = useState('')
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function checkStored() {
      const stored = localStorage.getItem(parentPinStorageKey(studentId))
      if (!stored) {
        if (!cancelled) setStage('enter')
        return
      }
      const { data, error: err } = await supabase.rpc('verify_parent_pin', { p_student_id: studentId, p_pin: stored })
      if (cancelled) return
      const row = data?.[0]
      if (err || !row?.ok) {
        localStorage.removeItem(parentPinStorageKey(studentId))
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
    localStorage.setItem(parentPinStorageKey(studentId), pin)
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
      setMsg('새 PIN이 서로 다릅니다.')
      return
    }
    setSubmitting(true)
    const { data: ok, error: err } = await supabase.rpc('set_parent_pin', { p_student_id: studentId, p_old_pin: oldPin, p_new_pin: newPin })
    setSubmitting(false)
    if (err || !ok) {
      setMsg('PIN 변경에 실패했습니다.')
      return
    }
    localStorage.setItem(parentPinStorageKey(studentId), newPin)
    onVerified(newPin)
  }

  if (stage === 'checking') {
    return <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>불러오는 중...</div>
  }

  const boxStyle = { maxWidth: 340, margin: '60px auto', fontFamily: "'Noto Sans KR', -apple-system, sans-serif", padding: '0 20px', color: THEME.ink }
  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    fontSize: 16,
    letterSpacing: 4,
    textAlign: 'center',
    border: `1px solid ${THEME.border}`,
    borderRadius: 12,
    boxSizing: 'border-box',
    marginBottom: 10,
    colorScheme: 'light',
  }
  const buttonStyle = { width: '100%', padding: 12, borderRadius: 12, border: 'none', background: THEME.primary, color: '#fff', fontWeight: 700, fontSize: 15 }

  if (stage === 'change') {
    return (
      <div style={boxStyle}>
        <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>PIN 변경이 필요합니다</p>
        <p style={{ fontSize: 13, color: THEME.inkMuted, marginBottom: 16 }}>처음 이용하시는군요. 앞으로 사용하실 4자리 PIN을 설정해주세요.</p>
        <form onSubmit={handleChangeSubmit}>
          <input type="text" inputMode="numeric" maxLength={4} placeholder="새 PIN 4자리" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} style={inputStyle} required />
          <input type="text" inputMode="numeric" maxLength={4} placeholder="새 PIN 확인" value={newPin2} onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ''))} style={inputStyle} required />
          {msg && <p style={{ color: 'red', fontSize: 12.5 }}>{msg}</p>}
          <button type="submit" disabled={submitting} style={buttonStyle}>
            {submitting ? '설정 중...' : 'PIN 설정하기'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={boxStyle}>
      <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>PIN 입력</p>
      <p style={{ fontSize: 13, color: THEME.inkMuted, marginBottom: 16 }}>자녀 정보 보호를 위해 4자리 PIN이 필요합니다. 처음이시라면 초기 PIN(0000)을 입력해주세요.</p>
      <form onSubmit={handleEnterSubmit}>
        <input type="text" inputMode="numeric" maxLength={4} placeholder="PIN 4자리" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} style={inputStyle} autoFocus required />
        {msg && <p style={{ color: 'red', fontSize: 12.5 }}>{msg}</p>}
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? '확인 중...' : '확인'}
        </button>
      </form>
      <Link to="/parent?new=1" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 12.5, color: THEME.inkMuted }}>
        ← 다시 검색하기
      </Link>
    </div>
  )
}
