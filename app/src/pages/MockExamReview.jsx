import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { PageHeader, PageLoading, PageError, EmptyState, Select } from '../lib/adminUI'

export default function MockExamReview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const classFilter = searchParams.get('class') ?? ''
  const [classes, setClasses] = useState([])
  const [attempts, setAttempts] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: classRows }, { data: rows, error: fetchErr }] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase
          .from('mock_exam_attempts')
          .select('id, total_score, type_stats, question_results, submitted_at, students(name, class_id, classes(name)), mock_exams(title, points)')
          .order('submitted_at', { ascending: false }),
      ])
      if (cancelled) return
      setClasses(classRows ?? [])
      if (fetchErr) {
        setError('불러오지 못했습니다: ' + fetchErr.message)
        return
      }
      setAttempts(rows ?? [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => (attempts ?? []).filter((a) => !classFilter || a.students?.class_id === classFilter), [attempts, classFilter])

  function maxScoreOf(a) {
    const points = a.mock_exams?.points
    if (!Array.isArray(points)) return null
    return points.reduce((sum, p) => sum + (Number(p) || 0), 0)
  }

  return (
    <div>
      <PageHeader
        title="모의고사 결과"
        subtitle="담당 반 학생들의 응시 결과를 확인합니다."
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
      {attempts && filtered.length === 0 && <EmptyState>응시 기록이 없습니다.</EmptyState>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((a) => {
          const maxScore = maxScoreOf(a)
          const typeEntries = Object.entries(a.type_stats ?? {})
          return (
            <div key={a.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenId(openId === a.id ? null : a.id)}>
                <span style={{ fontSize: 13.5, color: T.ink }}>
                  <strong>{a.students?.name}</strong>
                  <span style={{ color: T.inkFaint }}> ({a.students?.classes?.name ?? '반 미배정'})</span> — {a.mock_exams?.title}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.primaryDark }}>
                  {a.total_score}
                  {maxScore != null && <span style={{ fontSize: 11.5, fontWeight: 500, color: T.inkMuted }}> / {maxScore}</span>}
                </span>
              </div>

              {openId === a.id && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: T.inkMuted, margin: '0 0 8px' }}>유형별 정답률</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {typeEntries.map(([type, stat]) => (
                      <span key={type} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 999, background: T.bg, color: T.ink }}>
                        {type} {stat.correct}/{stat.total}
                      </span>
                    ))}
                  </div>

                  <p style={{ fontSize: 12.5, fontWeight: 700, color: T.inkMuted, margin: '0 0 8px' }}>문항별 채점</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4 }}>
                    {(a.question_results ?? []).map((r) => (
                      <div
                        key={r.q}
                        title={r.type}
                        style={{
                          border: `1px solid ${!r.counted ? T.border : r.isCorrect ? '#d9f2e3' : '#fbdcdc'}`,
                          background: !r.counted ? T.bg : r.isCorrect ? '#f2fbf6' : '#fef5f5',
                          borderRadius: 6,
                          padding: '4px 2px',
                          textAlign: 'center',
                          opacity: !r.counted ? 0.5 : 1,
                        }}
                      >
                        <div style={{ fontSize: 9.5, color: T.inkFaint }}>{r.q}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: !r.counted ? T.inkFaint : r.isCorrect ? '#186238' : '#a02323' }}>
                          {!r.counted ? '–' : r.isCorrect ? 'O' : 'X'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
