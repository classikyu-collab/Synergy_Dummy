import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { STATUS_COLORS, classifyStatus, todayStr } from '../lib/statusColors'
import { STUDENT_THEME as THEME } from '../lib/theme'
import StudentMenuDrawer, { StudentMenuButton, useStudentMenu } from './StudentMenu'
import PinGate from './PinGate'

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

function TypeBox({ typeName, items }) {
  if (items.length === 0) return null
  const borderColor = typeName === '시험' ? THEME.examBorder : THEME.primary
  return (
    <>
      <p style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, margin: '0 0 10px' }}>{typeName}</p>
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '4px 14px',
          borderLeft: `4px solid ${borderColor}`,
          boxShadow: '0 4px 14px -8px rgba(30,30,80,0.18)',
          marginBottom: 22,
        }}
      >
        {items.map((it, i) => (
          <div key={it.item_id} style={{ padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid #eceef7' }}>
            <p style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.35, margin: '0 0 10px' }}>
              {it.name}
              {it.page ? ` (p.${it.page})` : ''}
            </p>
            <StatusBadge label={it.status_label} isDone={it.is_done} />
          </div>
        ))}
      </div>
    </>
  )
}

export default function StudentCoachingList() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo="/student" backLabel="처음으로">
      {() => <StudentCoachingListContent />}
    </PinGate>
  )
}

function StudentCoachingListContent() {
  const { classId, studentId } = useParams()
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const { open, openMenu, closeMenu } = useStudentMenu()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: profileRows, error: profileErr }, { data: itemRows, error: itemErr }] = await Promise.all([
        supabase.rpc('get_student_profile', { p_student_id: studentId }),
        supabase.rpc('get_student_coaching_items', { p_student_id: studentId }),
      ])
      if (cancelled) return
      if (profileErr || itemErr) {
        setError('불러오지 못했습니다: ' + (profileErr || itemErr).message)
        return
      }
      if (!profileRows || profileRows.length === 0) {
        setError('학생 정보를 찾을 수 없습니다.')
        return
      }
      setProfile(profileRows[0])
      setItems(itemRows)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const base = `/student/${classId}/${studentId}`

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Link to={base}>← 처음으로</Link>
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
  const allDone = total > 0 && resolved === total

  const examItems = todayItems.filter((it) => it.item_type === '시험')
  const hwItems = todayItems.filter((it) => it.item_type === '숙제')

  const recentItems = items.filter((it) => it.date !== today)
  const recentByDate = []
  const dateIndex = {}
  recentItems.forEach((it) => {
    if (!(it.date in dateIndex)) {
      dateIndex[it.date] = recentByDate.length
      recentByDate.push({ date: it.date, items: [] })
    }
    recentByDate[dateIndex[it.date]].items.push(it)
  })

  return (
    <div style={{ position: 'relative', contain: 'layout', width: '100%', maxWidth: 520, margin: '0 auto', background: THEME.bg, fontFamily: "'Noto Sans KR', -apple-system, sans-serif", color: THEME.ink, minHeight: '100vh' }}>
      <div
        style={{
          position: 'relative',
          background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
          color: '#fff',
          padding: '22px 20px 26px',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <StudentMenuButton onClick={openMenu} />
        <Link
          to={base}
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
          홈으로
        </Link>

        <p style={{ fontSize: 17, fontWeight: 700, margin: '38px 46px 4px 46px', lineHeight: 1.4 }}>오늘 코칭 리스트</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: '0 46px 16px' }}>
          {profile.class_name} · {profile.difficulty_tier ?? '레벨 미지정'}
        </p>

        <div style={{ background: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          {total === 0 ? (
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>오늘 등록된 항목이 없습니다.</p>
          ) : (
            <>
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: `conic-gradient(#fff calc(${pct} * 1%), rgba(255,255,255,0.25) 0)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 5,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: allDone ? '#1c7a4d' : THEME.primaryDark,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: '#fff',
                  }}
                >
                  {resolved}/{total}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>오늘 {resolved}개 완료했어요</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '3px 0 0' }}>
                  {allDone ? '오늘 할 일을 모두 마쳤어요 🎉' : `${total - resolved}개 남았어요`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '18px 16px 28px' }}>
        <TypeBox typeName="시험" items={examItems} />
        <TypeBox typeName="숙제" items={hwItems} />
        {total === 0 && <p style={{ color: THEME.inkMuted, fontSize: 13 }}>등록된 항목이 없습니다.</p>}

        {recentByDate.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: THEME.inkMuted, margin: '0 0 0' }}>지난 기록</p>
            {recentByDate.map((block) => (
              <div key={block.date} style={{ background: '#fff', borderRadius: 16, padding: '12px 14px', boxShadow: '0 4px 14px -10px rgba(30,30,80,0.16)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.inkMuted, marginBottom: 8 }}>{block.date}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {block.items.map((it) => (
                    <div key={it.item_id} style={{ background: THEME.bg, borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                        {it.item_type} · {it.name}
                        {it.page ? ` (p.${it.page})` : ''}
                      </div>
                      <div>
                        <StatusBadge label={it.status_label} isDone={it.is_done} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StudentMenuDrawer open={open} onClose={closeMenu} classId={classId} studentId={studentId} active="coaching" theme={THEME} />
    </div>
  )
}
