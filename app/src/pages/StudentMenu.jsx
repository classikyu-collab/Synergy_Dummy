import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '../lib/pushNotifications'
import HomeScreenGuideModal from './HomeScreenGuide'

const ICONS = {
  home: (
    <path d="M3 11l9-8 9 8M5 10v10h4v-6h6v6h4V10" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  homework: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2.1" fill="none" />
      <path d="M9 3.5h6v2H9z" stroke="currentColor" strokeWidth="2.1" fill="none" />
      <path d="M9.5 12.5l1.6 1.6L14.5 10.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  coaching: (
    <path
      d="M9 6h11M9 12h11M9 18h11M4.5 6l.8.8L6.8 5.3M4.5 12l.8.8L6.8 11.3M4.5 18l.8.8L6.8 17.3"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  schoolExam: (
    <path d="M4 3h16v18H4zM8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  reading: (
    <path d="M9 2h6v12a3 3 0 01-6 0zM5 11a7 7 0 0014 0M12 18v3.5M9 21.5h6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  mockExam: (
    <>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.1" fill="none" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2.1" fill="none" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </>
  ),
  announcements: (
    <path d="M3 11l18-5v12L3 14v-3zM7 14v4a2 2 0 002 2h1" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
}

const TOP_ITEMS = [
  { key: 'home', label: '홈', path: '', icon: 'home', color: '#5b5bf0' },
  { key: 'homework', label: '숙제 보기', path: '/homework', icon: 'homework', color: '#f0975b' },
  { key: 'coaching', label: '코칭 리스트 보기', path: '/coaching', icon: 'coaching', color: '#3ba7a0' },
]

const CLASS_TYPE_GROUPS = {
  내신반: {
    label: '내신반',
    items: [
      { key: 'school-exam', label: '내신 OMR', path: '/school-exam', icon: 'schoolExam', color: '#4a9d6b' },
      { key: 'reading', label: '빠른 해석 녹음실', path: '/reading', icon: 'reading', color: '#9463d6' },
    ],
  },
  정규반: {
    label: '정규반',
    items: [{ key: 'mock-exam', label: '모의고사 OMR', path: '/mock-exam', icon: 'mockExam', color: '#d9558a' }],
  },
}

const BOTTOM_ITEMS = [{ key: 'announcements', label: '공지사항', path: '/announcements', icon: 'announcements', color: '#e0a530' }]

export function StudentMenuButton({ onClick, color = '#fff' }) {
  return (
    <button
      onClick={onClick}
      aria-label="메뉴 열기"
      style={{
        position: 'absolute',
        top: 18,
        left: 18,
        width: 34,
        height: 34,
        borderRadius: 10,
        border: 'none',
        background: 'rgba(255,255,255,0.16)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
      </svg>
    </button>
  )
}

export function useStudentMenu() {
  const [open, setOpen] = useState(false)
  return { open, openMenu: () => setOpen(true), closeMenu: () => setOpen(false) }
}

export default function StudentMenuDrawer({ open, onClose, classId, studentId, active, theme }) {
  const navigate = useNavigate()
  const [showGuide, setShowGuide] = useState(false)
  const [pushState, setPushState] = useState('checking') // checking | on | off
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMsg, setPushMsg] = useState('')

  useEffect(() => {
    if (!open || !isPushSupported()) return
    isPushSubscribed().then((sub) => setPushState(sub ? 'on' : 'off'))
  }, [open])

  if (!open) return null
  const base = `/student/${classId}/${studentId}`

  function handleLogout() {
    try {
      localStorage.removeItem(`synapse_student_pin_${studentId}`)
    } catch {
      // localStorage 접근 불가 시에도 이동은 계속 진행
    }
    onClose()
    navigate('/student')
  }

  async function handlePushToggle() {
    if (pushBusy) return
    setPushMsg('')
    setPushBusy(true)
    if (pushState === 'on') {
      await unsubscribeFromPush()
      setPushState('off')
      setPushBusy(false)
      return
    }
    const pin = localStorage.getItem(`synapse_student_pin_${studentId}`)
    if (!pin) {
      setPushMsg('PIN 확인이 필요해요. 다시 로그인해주세요.')
      setPushBusy(false)
      return
    }
    const result = await subscribeToPush({ subjectType: 'student', subjectId: studentId, pin })
    setPushBusy(false)
    if (result.ok) {
      setPushState('on')
    } else if (result.reason === 'denied') {
      setPushMsg('브라우저 알림 권한이 차단되어 있어요. 기기 설정에서 허용해주세요.')
    } else {
      setPushMsg('알림 설정에 실패했어요.')
    }
  }

  const visibleGroups = Object.values(CLASS_TYPE_GROUPS)

  function renderLink(item) {
    const isActive = item.key === active
    return (
      <Link
        key={item.key}
        to={`${base}${item.path}`}
        onClick={onClose}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 12px',
          borderRadius: 14,
          textDecoration: 'none',
          background: isActive ? theme.bg : 'transparent',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: item.color,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24">
            {ICONS[item.icon]}
          </svg>
        </div>
        <span style={{ fontSize: 14.5, fontWeight: isActive ? 800 : 600, color: isActive ? theme.primaryDark : theme.ink }}>{item.label}</span>
      </Link>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,40,0.4)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '78%',
          maxWidth: 305,
          height: '100%',
          maxHeight: '100dvh',
          background: '#fff',
          boxShadow: '4px 0 20px rgba(20,20,40,0.2)',
          padding: '26px 18px 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)` }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: theme.ink, letterSpacing: -0.2 }}>SYNAPSE</span>
          </div>
          <button
            onClick={onClose}
            aria-label="메뉴 닫기"
            style={{ width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer', color: theme.inkMuted, fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
          {TOP_ITEMS.map(renderLink)}

          {visibleGroups.map((group) => (
            <div key={group.label} style={{ marginTop: 10 }}>
              <p style={{ margin: '0 0 4px 12px', fontSize: 10.5, fontWeight: 800, color: '#b3b6c4', letterSpacing: 0.6 }}>{group.label}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{group.items.map(renderLink)}</div>
            </div>
          ))}

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${theme.border ?? '#eceef7'}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {BOTTOM_ITEMS.map(renderLink)}
          </div>
        </nav>

        <div
          style={{
            flexShrink: 0,
            paddingTop: 16,
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            borderTop: `1px solid ${theme.border ?? '#eceef7'}`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {isPushSupported() && (
            <>
              <button
                onClick={handlePushToggle}
                disabled={pushBusy || pushState === 'checking'}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: theme.inkMuted,
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: pushBusy ? 'default' : 'pointer',
                }}
              >
                {pushState === 'on' ? '🔔 알림 받는 중 (끄기)' : '🔕 알림 받기'}
              </button>
              {pushMsg && <p style={{ margin: '0 0 8px 14px', fontSize: 11.5, color: '#a02323' }}>{pushMsg}</p>}
            </>
          )}
          <button
            onClick={() => setShowGuide(true)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 600,
              color: theme.inkMuted,
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            📱 홈 화면에 추가하는 방법
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              color: '#a02323',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
      {showGuide && <HomeScreenGuideModal theme={theme} onDone={() => setShowGuide(false)} />}
    </div>
  )
}
