import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STATUS_COLORS, classifyStatus, todayStr } from '../lib/statusColors'

const THEME = {
  primary: '#0d9488',
  primaryDark: '#0a6f66',
  bg: '#f2f8f7',
  ink: '#1f2a29',
  inkMuted: '#7c8f8c',
  examBorder: '#f0975b',
  makeup: { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' },
}

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

export default function ParentView() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t')
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState(null)
  const [nextMakeup, setNextMakeup] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 링크입니다.')
      return
    }
    let cancelled = false
    async function load() {
      const { data: studentId, error: tokenErr } = await supabase.rpc('get_student_id_by_parent_token', {
        p_token: token,
      })
      if (cancelled) return
      if (tokenErr || !studentId) {
        setError('유효하지 않거나 만료된 링크입니다.')
        return
      }

      const [{ data: profileRows, error: profileErr }, { data: itemRows, error: itemErr }, { data: makeupDate }] = await Promise.all([
        supabase.rpc('get_student_profile', { p_student_id: studentId }),
        supabase.rpc('get_student_coaching_items', { p_student_id: studentId }),
        supabase.rpc('get_student_next_makeup', { p_student_id: studentId }),
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
  }, [token])

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <p style={{ color: 'red' }}>{error}</p>
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
      <div style={{ background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`, color: '#fff', padding: '22px 20px 26px', borderRadius: '0 0 28px 28px' }}>
        <p style={{ fontSize: 19, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.4 }}>{profile.name} 학생 학부모님, 안녕하세요.</p>
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
