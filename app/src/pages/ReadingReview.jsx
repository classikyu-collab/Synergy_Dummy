import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { useToast } from '../lib/toast'
import { PageHeader, PageLoading, PageError, EmptyState, PrimaryButton, Select } from '../lib/adminUI'

const SCORES = [100, 90, 80, 70]

export default function ReadingReview({ teacher }) {
  const showToast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const classFilter = searchParams.get('class') ?? ''
  const [classes, setClasses] = useState([])
  const [attempts, setAttempts] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [score, setScore] = useState(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  async function reload() {
    const [{ data: classRows }, { data: rows, error: fetchErr }] = await Promise.all([
      supabase.from('classes').select('id, name').order('name'),
      supabase
        .from('reading_attempts')
        .select('id, status, duration_sec, recommended_pct, score, comment, submitted_at, audio_path, students(name, class_id, classes(name)), reading_passages(title, recommended_seconds)')
        .eq('status', '제출완료')
        .order('submitted_at', { ascending: false }),
    ])
    setClasses(classRows ?? [])
    if (fetchErr) {
      setError('불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setAttempts(rows ?? [])
  }

  useEffect(() => {
    reload()
  }, [])

  const filtered = useMemo(() => (attempts ?? []).filter((a) => !classFilter || a.students?.class_id === classFilter), [attempts, classFilter])

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
      showToast('점수를 선택해주세요.', 'error')
      return
    }
    setSaving(true)
    const { error: updErr } = await supabase
      .from('reading_attempts')
      .update({ score, comment, graded_at: new Date().toISOString(), graded_by: teacher.id })
      .eq('id', attemptId)
    setSaving(false)
    if (updErr) {
      showToast('저장 실패: ' + updErr.message, 'error')
      return
    }
    showToast('채점을 저장했습니다.')
    setOpenId(null)
    reload()
  }

  return (
    <div>
      <PageHeader
        title="빠른 해석 녹음 채점"
        subtitle="담당 반 학생들의 제출 음원을 듣고 채점합니다."
        action={
          <Select value={classFilter} onChange={(e) => setSearchParams(e.target.value ? { class: e.target.value } : {})} style={{ width: 160 }}>
            <option value="">전체 반</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        }
      />

      <PageError>{error}</PageError>
      {!attempts && !error && <PageLoading />}
      {attempts && filtered.length === 0 && <EmptyState>제출된 녹음이 없습니다.</EmptyState>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((a) => (
          <div key={a.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => openAttempt(a)}>
              <span style={{ fontSize: 13.5, color: T.ink }}>
                <strong>{a.students?.name}</strong>
                <span style={{ color: T.inkFaint }}> ({a.students?.classes?.name ?? '반 미배정'})</span> — {a.reading_passages?.title} ({a.duration_sec}초{a.recommended_pct != null ? `, 권장대비 ${a.recommended_pct}%` : ''})
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: a.score != null ? '#186238' : T.inkFaint }}>{a.score != null ? `${a.score}점` : '채점 대기'}</span>
            </div>

            {openId === a.id && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                {audioUrl ? (
                  <audio controls src={audioUrl} style={{ width: '100%', marginBottom: 12 }} />
                ) : (
                  <p style={{ fontSize: 12.5, color: T.inkFaint }}>음원을 불러오는 중...</p>
                )}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {SCORES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setScore(s)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: score === s ? 800 : 600,
                        border: `1.5px solid ${score === s ? T.primary : T.border}`,
                        background: score === s ? T.primaryTint : T.surface,
                        color: score === s ? T.primaryDark : T.inkMuted,
                        cursor: 'pointer',
                      }}
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
                  style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10, padding: '9px 12px', fontSize: 13, borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: 'inherit', resize: 'vertical' }}
                />
                <PrimaryButton onClick={() => save(a.id)} disabled={saving}>
                  {saving ? '저장 중...' : '채점 저장'}
                </PrimaryButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
