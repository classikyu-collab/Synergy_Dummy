import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import HomeScreenGuideModal, { hasSeenHomeGuide, markHomeGuideSeen, isStandaloneDisplay } from './HomeScreenGuide'

// 학부모/학생 PIN 로그인 공용 게이트. 이름(또는 반) 선택 직후, 진짜 콘텐츠를 보여주기 전에
// 4자리 PIN을 확인한다. 최초 PIN(0000)이면 강제로 새 PIN을 설정하게 하고,
// 검증된 PIN은 로컬에 저장해서 다음부터는 다시 물어보지 않는다.
export default function PinGate({ subjectId, verifiedRpc, setRpc, storagePrefix, backTo, backLabel, theme, children }) {
  const [pin, setPinValue] = useState(null)
  const [stage, setStage] = useState('checking') // checking | enter | change | done
  const [inputPin, setInputPin] = useState('')
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPin2, setNewPin2] = useState('')
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const storageKey = `${storagePrefix}_${subjectId}`
  const homeGuideKey = `synapse_home_guide_seen_${storagePrefix}_${subjectId}`
  const [homeGuideAcked, setHomeGuideAcked] = useState(() => hasSeenHomeGuide(homeGuideKey) || isStandaloneDisplay())

  useEffect(() => {
    let cancelled = false
    async function checkStored() {
      const stored = localStorage.getItem(storageKey)
      if (!stored) {
        if (!cancelled) setStage('enter')
        return
      }
      const { data, error: err } = await supabase.rpc(verifiedRpc, { p_student_id: subjectId, p_pin: stored })
      if (cancelled) return
      const row = data?.[0]
      if (err || !row?.ok) {
        localStorage.removeItem(storageKey)
        setStage('enter')
        return
      }
      if (row.must_change) {
        setOldPin(stored)
        setStage('change')
        return
      }
      setPinValue(stored)
      setStage('done')
    }
    checkStored()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId])

  async function handleEnterSubmit(e) {
    e.preventDefault()
    setMsg('')
    setSubmitting(true)
    const { data, error: err } = await supabase.rpc(verifiedRpc, { p_student_id: subjectId, p_pin: inputPin })
    setSubmitting(false)
    const row = data?.[0]
    if (err || !row?.ok) {
      setMsg('PIN이 올바르지 않습니다.')
      return
    }
    if (row.must_change) {
      setOldPin(inputPin)
      setStage('change')
      return
    }
    localStorage.setItem(storageKey, inputPin)
    setPinValue(inputPin)
    setStage('done')
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
    const { data: ok, error: err } = await supabase.rpc(setRpc, { p_student_id: subjectId, p_old_pin: oldPin, p_new_pin: newPin })
    setSubmitting(false)
    if (err || !ok) {
      setMsg('PIN 변경에 실패했습니다.')
      return
    }
    localStorage.setItem(storageKey, newPin)
    setPinValue(newPin)
    setStage('done')
  }

  if (stage === 'done') {
    if (!homeGuideAcked) {
      return (
        <HomeScreenGuideModal
          theme={theme}
          onDone={() => {
            markHomeGuideSeen(homeGuideKey)
            setHomeGuideAcked(true)
          }}
        />
      )
    }
    return children(pin)
  }

  if (stage === 'checking') {
    return <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>불러오는 중...</div>
  }

  const boxStyle = { maxWidth: 340, margin: '60px auto', fontFamily: "'Noto Sans KR', -apple-system, sans-serif", padding: '0 20px' }
  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    fontSize: 16,
    letterSpacing: 4,
    textAlign: 'center',
    border: `1px solid ${theme.border ?? '#dcece9'}`,
    borderRadius: 12,
    boxSizing: 'border-box',
    marginBottom: 10,
    colorScheme: 'light',
  }
  const buttonStyle = {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: 'none',
    background: theme.primary,
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
  }

  if (stage === 'change') {
    return (
      <div style={boxStyle}>
        <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>PIN 변경이 필요합니다</p>
        <p style={{ fontSize: 13, color: theme.inkMuted, marginBottom: 16 }}>처음 이용하시는군요. 앞으로 사용하실 4자리 PIN을 설정해주세요.</p>
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
      <p style={{ fontSize: 13, color: theme.inkMuted, marginBottom: 16 }}>본인 확인을 위해 4자리 PIN이 필요합니다. 처음이시라면 초기 PIN(0000)을 입력해주세요.</p>
      <form onSubmit={handleEnterSubmit}>
        <input type="text" inputMode="numeric" maxLength={4} placeholder="PIN 4자리" value={inputPin} onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))} style={inputStyle} autoFocus required />
        {msg && <p style={{ color: 'red', fontSize: 12.5 }}>{msg}</p>}
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? '확인 중...' : '확인'}
        </button>
      </form>
      {backTo && (
        <Link to={backTo} style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 12.5, color: theme.inkMuted }}>
          ← {backLabel ?? '뒤로'}
        </Link>
      )}
    </div>
  )
}
