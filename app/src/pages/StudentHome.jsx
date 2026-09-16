import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { todayStr } from '../lib/statusColors'
import { STUDENT_THEME as THEME } from '../lib/theme'
import StudentMenuDrawer, { StudentMenuButton, useStudentMenu } from './StudentMenu'
import PinGate from './PinGate'
import { loadSeenIds } from '../lib/announcementSeen'

const TILE_ICONS = {
  coaching: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  announcements: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 14v-3z" />
      <path d="M7 14v4a2 2 0 002 2h1" />
    </svg>
  ),
  schoolExam: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v5h5" />
      <path d="M6 3h8l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M9 13l2 2 4-4" />
    </svg>
  ),
  reading: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0014 0" />
      <path d="M12 18v4M9 22h6" />
    </svg>
  ),
  placeholder: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
}

function Tile({ icon, label, sublabel, to, ready, badgeCount }) {
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
        boxShadow: '0 4px 14px -8px rgba(30,30,80,0.18)',
        opacity: ready ? 1 : 0.55,
        height: '100%',
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
          NEW
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
        <p style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 3px', color: THEME.ink }}>{label}</p>
        <p style={{ fontSize: 12, color: THEME.inkMuted, margin: 0 }}>{sublabel}</p>
      </div>
    </div>
  )
  if (!ready) return content
  return (
    <Link to={to} style={{ display: 'block' }}>
      {content}
    </Link>
  )
}

export default function StudentHome() {
  const { studentId } = useParams()
  return (
    <PinGate subjectId={studentId} verifiedRpc="verify_student_pin" setRpc="set_student_pin" storagePrefix="synapse_student_pin" theme={THEME} backTo="/student" backLabel="처음으로">
      {() => <StudentHomeContent />}
    </PinGate>
  )
}

function StudentHomeContent() {
  const { classId, studentId } = useParams()
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [error, setError] = useState('')
  const { open, openMenu, closeMenu } = useStudentMenu()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: profileRows, error: profileErr }, { data: itemRows, error: itemErr }, { data: annRows }] = await Promise.all([
        supabase.rpc('get_student_profile', { p_student_id: studentId }),
        supabase.rpc('get_student_coaching_items', { p_student_id: studentId }),
        supabase.rpc('list_student_announcements', { p_student_id: studentId }),
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
      setAnnouncements(annRows ?? [])
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
        <Link to="/student">← 처음으로</Link>
      </div>
    )
  }
  if (!profile) {
    return <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>불러오는 중...</div>
  }

  const today = todayStr()
  const todayItems = (items ?? []).filter((it) => it.date === today)
  const resolved = todayItems.filter((it) => it.is_done).length
  const total = todayItems.length
  const coachingSublabel = total === 0 ? '오늘 등록된 항목 없음' : `오늘 ${resolved}/${total}개 완료`
  const announcementsSublabel = announcements.length === 0 ? '새 소식 없음' : `${announcements.length}개의 소식`
  const seenIds = loadSeenIds(studentId)
  const unreadAnnouncements = announcements.filter((a) => !seenIds.has(a.id)).length

  return (
    <div style={{ position: 'relative', contain: 'layout', width: '100%', maxWidth: 520, margin: '0 auto', background: THEME.bg, fontFamily: "'Noto Sans KR', -apple-system, sans-serif", color: THEME.ink, minHeight: '100vh' }}>
      <div
        style={{
          position: 'relative',
          background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
          color: '#fff',
          padding: '22px 20px 30px',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <StudentMenuButton onClick={openMenu} />
        <p style={{ fontSize: 19, fontWeight: 700, margin: '38px 20px 4px 46px', lineHeight: 1.4 }}>{profile.name} 학생, 오늘도 힘내봐요!</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: '0 20px 0 46px' }}>
          {profile.class_name} · {profile.difficulty_tier ?? '레벨 미지정'}
        </p>
      </div>

      <div style={{ padding: '18px 16px 28px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>바로가기</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Tile icon={TILE_ICONS.coaching} label="오늘 코칭 리스트" sublabel={coachingSublabel} to={`${base}/coaching`} ready />
          <Tile icon={TILE_ICONS.announcements} label="공지사항" sublabel={announcementsSublabel} to={`${base}/announcements`} ready badgeCount={unreadAnnouncements} />
          <Tile icon={TILE_ICONS.schoolExam} label="내신 시험지" sublabel="답안 입력하고 채점받기" to={`${base}/school-exam`} ready />
          <Tile icon={TILE_ICONS.reading} label="빠른 해석 녹음실" sublabel="지문 읽고 녹음 제출하기" to={`${base}/reading`} ready />
        </div>
      </div>

      <StudentMenuDrawer open={open} onClose={closeMenu} classId={classId} studentId={studentId} active="home" theme={THEME} />
    </div>
  )
}
