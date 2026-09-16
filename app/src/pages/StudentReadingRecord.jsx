import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STUDENT_THEME as THEME } from '../lib/theme'
import PinGate from './PinGate'

const MAX_SECONDS_FALLBACK = 360

export default function StudentReadingRecord() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo="/student" backLabel="처음으로">
      {(pin) => <StudentReadingRecordContent pin={pin} />}
    </PinGate>
  )
}

function StudentReadingRecordContent({ pin }) {
  const { classId, studentId, passageId } = useParams()
  const navigate = useNavigate()

  const [stage, setStage] = useState('loading') // loading | guide | recording | submitting | error
  const [attempt, setAttempt] = useState(null) // { attempt_id, presented_text, recommended_seconds, max_seconds }
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [micError, setMicError] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function start() {
      const { data, error: rpcErr } = await supabase.rpc('start_reading_attempt', { p_student_id: studentId, p_pin: pin, p_passage_id: passageId })
      if (cancelled) return
      if (rpcErr) {
        setError(rpcErr.message)
        setStage('error')
        return
      }
      setAttempt(data?.[0])
      setStage('guide')
    }
    start()
    return () => {
      cancelled = true
      stopTimer()
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageId])

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function beginRecording() {
    setMicError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setStage('recording')
      setElapsed(0)
      const maxSec = attempt?.max_seconds ?? MAX_SECONDS_FALLBACK
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1
          if (next >= maxSec) {
            stopTimer()
            finishAndSubmit()
          }
          return next
        })
      }, 1000)
    } catch (e) {
      setMicError('마이크 접근이 거부되었거나 사용할 수 없습니다. 브라우저 마이크 권한을 확인해주세요.')
    }
  }

  function finishAndSubmit() {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    recorder.onstop = async () => {
      stopStream()
      await uploadAndSubmit()
    }
    recorder.stop()
  }

  async function uploadAndSubmit() {
    setStage('submitting')
    const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' })
    const ext = blob.type.includes('mp4') ? 'm4a' : 'webm'
    const path = `${studentId}/${attempt.attempt_id}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('reading-audio').upload(path, blob, { contentType: blob.type, upsert: true })
    if (uploadErr) {
      setError('업로드에 실패했습니다: ' + uploadErr.message)
      setStage('error')
      return
    }
    const { error: rpcErr } = await supabase.rpc('submit_reading_attempt', {
      p_student_id: studentId,
      p_pin: pin,
      p_attempt_id: attempt.attempt_id,
      p_audio_path: path,
      p_duration_sec: elapsed,
    })
    if (rpcErr) {
      setError('제출에 실패했습니다: ' + rpcErr.message)
      setStage('error')
      return
    }
    navigate(`/student/${classId}/${studentId}/reading`, { replace: true })
  }

  async function handleStopAndSubmit() {
    stopTimer()
    finishAndSubmit()
  }

  async function handleReRecord() {
    stopTimer()
    stopStream()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    if (attempt?.attempt_id) {
      await supabase.rpc('discard_reading_attempt', { p_student_id: studentId, p_pin: pin, p_attempt_id: attempt.attempt_id })
    }
    setStage('loading')
    const { data, error: rpcErr } = await supabase.rpc('start_reading_attempt', { p_student_id: studentId, p_pin: pin, p_passage_id: passageId })
    if (rpcErr) {
      setError(rpcErr.message)
      setStage('error')
      return
    }
    setAttempt(data?.[0])
    setStage('guide')
  }

  const base = `/student/${classId}/${studentId}`

  if (stage === 'error') {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Link to={`${base}/reading`}>← 지문 목록</Link>
      </div>
    )
  }
  if (stage === 'loading') {
    return <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>불러오는 중...</div>
  }

  const maxSec = attempt?.max_seconds ?? MAX_SECONDS_FALLBACK
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div style={{ position: 'relative', contain: 'layout', width: '100%', maxWidth: 520, margin: '0 auto', background: THEME.bg, fontFamily: "'Noto Sans KR', -apple-system, sans-serif", color: THEME.ink, minHeight: '100vh', paddingBottom: 40 }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
          color: '#fff',
          padding: '20px 20px 22px',
          borderRadius: '0 0 24px 24px',
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.35 }}>
          {stage === 'recording' ? '녹음 중' : stage === 'submitting' ? '제출 중...' : '읽기 안내'}
        </p>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', margin: 0 }}>권장 {attempt?.recommended_seconds ?? 0}초 · 최대 {maxSec}초</p>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', boxShadow: '0 4px 14px -8px rgba(30,30,80,0.18)', marginBottom: 16 }}>
          <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{attempt?.presented_text}</p>
        </div>

        {stage === 'guide' && (
          <>
            {micError && <p style={{ color: 'red', fontSize: 12.5, marginBottom: 10 }}>{micError}</p>}
            <button
              type="button"
              onClick={beginRecording}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: 16,
                border: 'none',
                background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
                color: '#fff',
                fontSize: 15.5,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 20px -8px rgba(67,65,201,0.6)',
              }}
            >
              녹음 시작하기
            </button>
          </>
        )}

        {stage === 'recording' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 28, fontWeight: 800, color: THEME.primaryDark }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#e2544d', animation: 'pulse 1s infinite' }} />
                {mm}:{ss}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleReRecord}
                style={{ flex: 1, padding: '13px', borderRadius: 14, border: `1.5px solid ${THEME.primary}`, background: '#fff', color: THEME.primaryDark, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                다시 녹음
              </button>
              <button
                type="button"
                onClick={handleStopAndSubmit}
                style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: THEME.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                녹음 종료 및 제출
              </button>
            </div>
          </>
        )}

        {stage === 'submitting' && <p style={{ textAlign: 'center', color: THEME.inkMuted, fontSize: 13 }}>업로드 중입니다...</p>}
      </div>
    </div>
  )
}
