import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const SCORES = [100, 90, 80, 70]

export default function ReadingReview({ teacher }) {
  const { classId } = useParams()
  const [className, setClassName] = useState('')
  const [attempts, setAttempts] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [score, setScore] = useState(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  async function reload() {
    const [{ data: cls }, { data: studentRows }] = await Promise.all([
      supabase.from('classes').select('name').eq('id', classId).single(),
      supabase.from('students').select('id').eq('class_id', classId),
    ])
    setClassName(cls?.name ?? '')
    const studentIds = studentRows?.map((s) => s.id) ?? []
    if (studentIds.length === 0) {
      setAttempts([])
      return
    }
    const { data: rows, error: fetchErr } = await supabase
      .from('reading_attempts')
      .select('id, status, duration_sec, recommended_pct, score, comment, submitted_at, audio_path, students(name), reading_passages(title, recommended_seconds)')
      .in('student_id', studentIds)
      .eq('status', '제출완료')
      .order('submitted_at', { ascending: false })
    if (fetchErr) {
      setError('불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setAttempts(rows ?? [])
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId])

  async function openAttempt(a) {
    if (openId === a.id) {
      setOpenId(null)
      setAudioUrl(null)
      return
    }
    setOpenId(a.id)
    setScore(a.score ?? null)
    setComment(a.comment ?? '')
    setAudioUrl(null)
    if (a.audio_path) {
      const { data, error: urlErr } = await supabase.storage.from('reading-audio').createSignedUrl(a.audio_path, 3600)
      if (!urlErr) setAudioUrl(data.signedUrl)
    }
  }

  async function save(attemptId) {
    if (!score) {
      alert('점수를 선택해주세요.')
      return
    }
    setSaving(true)
    const { error: updErr } = await supabase
      .from('reading_attempts')
      .update({ score, comment, graded_at: new Date().toISOString(), graded_by: teacher.id })
      .eq('id', attemptId)
    setSaving(false)
    if (updErr) {
      alert('저장 실패: ' + updErr.message)
      return
    }
    setOpenId(null)
    reload()
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <p>
        <Link to={`/staff/classes/${classId}`}>← {className || '반'} 상세로</Link>
      </p>
      <h2>빠른 해석 녹음 채점 — {className}</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!attempts && !error && <p>불러오는 중...</p>}
      {attempts && attempts.length === 0 && <p>제출된 녹음이 없습니다.</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {attempts?.map((a) => (
          <li key={a.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => openAttempt(a)}>
              <span>
                <strong>{a.students?.name}</strong> — {a.reading_passages?.title} ({a.duration_sec}초{a.recommended_pct != null ? `, 권장대비 ${a.recommended_pct}%` : ''})
              </span>
              <span style={{ fontSize: 12, color: a.score != null ? '#186238' : '#888' }}>{a.score != null ? `${a.score}점` : '채점 대기'}</span>
            </div>

            {openId === a.id && (
              <div style={{ marginTop: 10, borderTop: '1px solid #eee', paddingTop: 10 }}>
                {audioUrl ? (
                  <audio controls src={audioUrl} style={{ width: '100%', marginBottom: 10 }} />
                ) : (
                  <p style={{ fontSize: 13, color: '#888' }}>음원을 불러오는 중...</p>
                )}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {SCORES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setScore(s)}
                      style={{ padding: '6px 12px', fontWeight: score === s ? 700 : 400, border: score === s ? '2px solid #333' : '1px solid #ccc' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="코멘트 (선택)"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
                />
                <button onClick={() => save(a.id)} disabled={saving}>
                  {saving ? '저장 중...' : '채점 저장'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
