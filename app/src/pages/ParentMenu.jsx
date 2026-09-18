import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadKnownChildren } from '../lib/parentChildren'
import { parentPinStorageKey } from './ParentPinGate'
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '../lib/pushNotifications'
import HomeScreenGuideModal from './HomeScreenGuide'

const TOP_ITEMS = [
  { key: 'home', label: '홈', path: '' },
  { key: 'homework', label: '숙제 보기', path: '/homework' },
]

const COACHING_GROUP = {
  label: '코칭 기록 보기',
  items: [
    { key: 'coaching-recent', label: '최근 결과 보기', path: '/coaching' },
    { key: 'coaching-4w', label: '지난 4주 결과 보기', path: '/coaching?range=4w' },
  ],
}

const BOTTOM_ITEMS = [{ key: 'announcements', label: '공지사항', path: '/announcements' }]

export function ParentMenuButton({ onClick, color = '#fff' }) {
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

export function useParentMenu() {
  const [open, setOpen] = useState(false)
  const [autoSwitcher, setAutoSwitcher] = useState(false)
  return {
    open,
    autoSwitcher,
    openMenu: (opts) => {
      setAutoSwitcher(!!opts?.switcher)
      setOpen(true)
    },
    closeMenu: () => setOpen(false),
  }
}

export default function ParentMenuDrawer({ open, onClose, studentId, active, theme, autoSwitcher = false }) {
  const navigate = useNavigate()
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [pushState, setPushState] = useState('checking') // checking | on | off
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMsg, setPushMsg] = useState('')

  useEffect(() => {
    if (open) setShowSwitcher(autoSwitcher)
  }, [open, autoSwitcher])

  useEffect(() => {
    if (!open || !isPushSupported()) return
    isPushSubscribed().then((sub) => setPushState(sub ? 'on' : 'off'))
  }, [open])

  if (!open) return null

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
    const pin = localStorage.getItem(parentPinStorageKey(studentId))
    if (!pin) {
      setPushMsg('PIN 확인이 필요해요. 다시 로그인해주세요.')
      setPushBusy(false)
      return
    }
    const result = await subscribeToPush({ subjectType: 'parent', subjectId: studentId, pin })
    setPushBusy(false)
    if (result.ok) {
      setPushState('on')
    } else if (result.reason === 'denied') {
      setPushMsg('브라우저 알림 권한이 차단되어 있어요. 기기 설정에서 허용해주세요.')
    } else {
      setPushMsg('알림 설정에 실패했어요.')
    }
  }
  const base = `/parent/${studentId}`
  const otherChildren = loadKnownChildren().filter((c) => c.id !== studentId)

  function handleLogout() {
    try {
      localStorage.removeItem(`synapse_parent_pin_${studentId}`)
    } catch {
      // localStorage 접근 불가 시에도 이동은 계속 진행
    }
    onClose()
    navigate('/parent')
  }

  function goToChild(id) {
    onClose()
    setShowSwitcher(false)
    navigate(`/parent/${id}`)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,40,0.4)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '78%',
          maxWidth: 300,
          height: '100%',
          maxHeight: '100dvh',
          background: '#fff',
          boxShadow: '4px 0 20px rgba(20,20,40,0.2)',
          padding: '22px 18px 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: theme.ink }}>SYNAPSE</span>
          <button
            onClick={onClose}
            aria-label="메뉴 닫기"
            style={{ width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer', color: theme.inkMuted, fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
          {TOP_ITEMS.map((item) => {
            const isActive = item.key === active
            return (
              <Link
                key={item.key}
                to={`${base}${item.path}`}
                onClick={onClose}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: isActive ? theme.primaryDark : theme.ink,
                  background: isActive ? theme.bg : 'transparent',
                }}
              >
                {item.label}
              </Link>
            )
          })}

          <div style={{ marginTop: 6 }}>
            <p style={{ margin: '0 0 4px 14px', fontSize: 10.5, fontWeight: 800, color: '#b3b6c4', letterSpacing: 0.6 }}>{COACHING_GROUP.label}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {COACHING_GROUP.items.map((item) => {
                const isActive = item.key === active
                return (
                  <Link
                    key={item.key}
                    to={`${base}${item.path}`}
                    onClick={onClose}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      fontSize: 14.5,
                      fontWeight: 700,
                      color: isActive ? theme.primaryDark : theme.ink,
                      background: isActive ? theme.bg : 'transparent',
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${theme.border ?? '#e8e1d3'}` }}>
            {BOTTOM_ITEMS.map((item) => {
              const isActive = item.key === active
              return (
                <Link
                  key={item.key}
                  to={`${base}${item.path}`}
                  onClick={onClose}
                  style={{
                    display: 'block',
                    padding: '12px 14px',
                    borderRadius: 12,
                    fontSize: 14.5,
                    fontWeight: 700,
                    color: isActive ? theme.primaryDark : theme.ink,
                    background: isActive ? theme.bg : 'transparent',
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <button
            onClick={() => setShowSwitcher((v) => !v)}
            style={{
              marginTop: 10,
              padding: '12px 14px',
              borderRadius: 12,
              fontSize: 14.5,
              fontWeight: 700,
              color: theme.ink,
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            다른 자녀 전환
            <span style={{ color: theme.inkMuted, fontSize: 11 }}>{showSwitcher ? '▲' : '▼'}</span>
          </button>

          {showSwitcher && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8, marginBottom: 4 }}>
              {otherChildren.length === 0 && <p style={{ fontSize: 12, color: theme.inkMuted, margin: '2px 0 6px' }}>아직 확인해본 다른 자녀가 없어요.</p>}
              {otherChildren.map((c) => (
                <button
                  key={c.id}
                  onClick={() => goToChild(c.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: theme.ink,
                    background: theme.bg,
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {c.name}
                </button>
              ))}
              <Link
                to="/parent?new=1"
                onClick={onClose}
                style={{ padding: '10px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: theme.primaryDark }}
              >
                + 새 자녀 이름으로 찾기
              </Link>
            </div>
          )}
        </nav>

        <div
          style={{
            flexShrink: 0,
            paddingTop: 16,
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            borderTop: `1px solid ${theme.border ?? '#e8e1d3'}`,
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
