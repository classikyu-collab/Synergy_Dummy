import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { todayStr } from '../lib/statusColors'
import { PARENT_THEME as THEME } from '../lib/theme'
import HomeScreenGuideModal, { hasSeenHomeGuide, markHomeGuideSeen, isStandaloneDisplay } from './HomeScreenGuide'
import ParentMenuDrawer, { ParentMenuButton, useParentMenu } from './ParentMenu'
import ParentPinGate from './ParentPinGate'
import { loadKnownChildren, rememberChild } from '../lib/parentChildren'
import { loadSeenIds } from '../lib/announcementSeen'

const TILE_ICONS = {
  coaching: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  homework: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 2.5h8v2H8z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  announcements: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 14v-3z" />
      <path d="M7 14v4a2 2 0 002 2h1" />
    </svg>
  ),
  switch: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3l4 4-4 4" />
      <path d="M21 7H9a4 4 0 00-4 4" />
      <path d="M7 21l-4-4 4-4" />
      <path d="M3 17h12a4 4 0 004-4" />
    </svg>
  ),
}

function Tile({ icon, label, sublabel, to, onClick, badgeCount }) {
  const content = (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 18,
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 4px 14px -8px rgba(43,38,33,0.18)',
        height: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        border: 'none',
        textAlign: 'left',
        width: '100%',
        fontFamily: 'inherit',
      }}
    >
      {badgeCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontSize: 10,
            fontWeight: 800,
            color: '#fff',
            background: THEME.examBorder ?? '#e2544d',
            borderRadius: 999,
            padding: '2px 7px',
          }}
        >
          {badgeCount}
        </span>
      )}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: THEME.bg,
          color: THEME.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 3px', color: THEME.ink, wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{label}</p>
        <p style={{ fontSize: 12, color: THEME.inkMuted, margin: 0 }}>{sublabel}</p>
      </div>
    </div>
  )
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ background: 'none', padding: 0, border: 'none', display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
      >
        {content}
      </button>
    )
  }
  return (
    <Link to={to} style={{ display: 'block', minWidth: 0, boxSizing: 'border-box' }}>
      {content}
    </Link>
  )
}

export default function ParentDetail() {
  const { studentId } = useParams()
  const [verifiedPin, setVerifiedPin] = useState(null)
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState(null)
  const [homework, setHomework] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [nextMakeup, setNextMakeup] = useState(null)
  const [error, setError] = useState('')
  const homeGuideKey = `synapse_home_guide_seen_parent_${studentId}`
  const [homeGuideAcked, setHomeGuideAcked] = useState(() => hasSeenHomeGuide(homeGuideKey) || isStandaloneDisplay())
  const [showGuideAgain, setShowGuideAgain] = useState(false)
  const { open: menuOpen, autoSwitcher, openMenu, closeMenu } = useParentMenu()

  useEffect(() => {
    if (!verifiedPin) return
    let cancelled = false
    async function load() {
      const [{ data: profileRows, error: profileErr }, { data: itemRows, error: itemErr }, { data: makeupDate }, { data: hwRows }, { data: annRows }] = await Promise.all([
        supabase.rpc('get_parent_profile', { p_student_id: studentId, p_pin: verifiedPin }),
        supabase.rpc('get_parent_coaching_items', { p_student_id: studentId, p_pin: verifiedPin }),
        supabase.rpc('get_parent_next_makeup', { p_student_id: studentId, p_pin: verifiedPin }),
        supabase.rpc('get_parent_homework_board', { p_student_id: studentId, p_pin: verifiedPin }),
        supabase.rpc('list_parent_announcements', { p_student_id: studentId, p_pin: verifiedPin }),
      ])
      if (cancelled) return
      if (profileErr || itemErr || !profileRows?.length) {
        setError('학생 정보를 불러오지 못했습니다.')
        return
      }
      setProfile(profileRows[0])
      rememberChild(studentId, profileRows[0].name)
      setItems(itemRows)
      setNextMakeup(makeupDate ?? null)
      setHomework(hwRows ?? [])
      setAnnouncements(annRows ?? [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [studentId, verifiedPin])

  if (!verifiedPin) {
    return <ParentPinGate studentId={studentId} onVerified={setVerifiedPin} />
  }

  if (!homeGuideAcked) {
    return (
      <HomeScreenGuideModal
        theme={THEME}
        onDone={() => {
          markHomeGuideSeen(homeGuideKey)
          setHomeGuideAcked(true)
        }}
      />
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Link to="/parent?new=1">← 다시 검색하기</Link>
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
  const coachingSublabel = total === 0 ? '오늘 등록된 항목 없음' : `오늘 ${resolved}/${total}개 완료`

  const nextDate = homework && homework.length > 0 ? [...new Set(homework.map((it) => it.posted_date))].sort((a, b) => (a < b ? 1 : -1))[0] : null
  const nextHomeworkCount = nextDate ? homework.filter((it) => it.posted_date === nextDate).length : 0
  const homeworkSublabel = nextDate ? `${nextHomeworkCount}개 등록됨` : '등록된 숙제 없음'

  const seenAnnIds = loadSeenIds(studentId, 'parent')
  const unreadAnnouncements = announcements.filter((a) => !seenAnnIds.has(a.id)).length
  const announcementsSublabel = announcements.length === 0 ? '새 소식 없음' : `${announcements.length}개의 소식`

  const otherChildrenCount = loadKnownChildren().filter((c) => c.id !== studentId).length
  const switchSublabel = otherChildrenCount === 0 ? '등록된 다른 자녀 없음' : `${otherChildrenCount}명 확인 가능`

  const base = `/parent/${studentId}`

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
        <ParentMenuButton onClick={openMenu} />
        <p style={{ fontSize: 19, fontWeight: 700, margin: '38px 0 4px 46px', lineHeight: 1.4 }}>{profile.name} 학생의 학부모님, 안녕하세요.</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: '0 0 0 46px' }}>학습 결과는 수업 다음날 오후 6시부터 확인하실 수 있어요.</p>
      </div>

      <div style={{ padding: '18px 16px 28px' }}>
        <button
          type="button"
          onClick={() => setShowGuideAgain(true)}
          style={{
            display: 'block',
            marginBottom: 14,
            padding: 0,
            background: 'none',
            border: 'none',
            color: THEME.inkMuted,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          📱 홈 화면에 추가하는 방법
        </button>

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
            boxShadow: '0 4px 14px -10px rgba(43,38,33,0.16)',
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
              boxShadow: '0 4px 14px -10px rgba(43,38,33,0.16)',
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

        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>바로가기</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <Tile icon={TILE_ICONS.coaching} label="최근 숙제/시험 결과 보기" sublabel={coachingSublabel} to={`${base}/coaching`} />
          <Tile icon={TILE_ICONS.homework} label="다음 숙제 확인" sublabel={homeworkSublabel} to={`${base}/homework`} />
          <Tile icon={TILE_ICONS.announcements} label="공지사항" sublabel={announcementsSublabel} to={`${base}/announcements`} badgeCount={unreadAnnouncements} />
          <Tile icon={TILE_ICONS.switch} label="다른 자녀 전환" sublabel={switchSublabel} onClick={() => openMenu({ switcher: true })} />
        </div>
      </div>
      {showGuideAgain && <HomeScreenGuideModal theme={THEME} onDone={() => setShowGuideAgain(false)} />}
      <ParentMenuDrawer open={menuOpen} onClose={closeMenu} studentId={studentId} active="home" theme={THEME} autoSwitcher={autoSwitcher} />
    </div>
  )
}
