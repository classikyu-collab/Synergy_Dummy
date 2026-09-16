import { useState } from 'react'
import { Link } from 'react-router-dom'

const MENU_ITEMS = [
  { key: 'home', label: '홈', ready: true, path: '' },
  { key: 'coaching', label: '오늘의 코칭', ready: true, path: '/coaching' },
  { key: 'mock-exam', label: '모의고사 OMR', ready: true, path: '/mock-exam' },
  { key: 'announcements', label: '공지사항', ready: true, path: '/announcements' },
  { key: 'school-exam', label: '내신 시험지', ready: true, path: '/school-exam' },
  { key: 'reading', label: '빠른 해석 지문', ready: true, path: '/reading' },
]

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
  if (!open) return null
  const base = `/student/${classId}/${studentId}`

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,40,0.4)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '78%',
          maxWidth: 300,
          height: '100%',
          background: '#fff',
          boxShadow: '4px 0 20px rgba(20,20,40,0.2)',
          padding: '22px 18px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: theme.ink }}>SYNAPSE</span>
          <button
            onClick={onClose}
            aria-label="메뉴 닫기"
            style={{ width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer', color: theme.inkMuted, fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {MENU_ITEMS.map((item) => {
            const isActive = item.key === active
            if (!item.ready) {
              return (
                <div
                  key={item.key}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: theme.inkMuted,
                    opacity: 0.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  {item.label}
                  <span style={{ fontSize: 11, fontWeight: 600 }}>준비 중</span>
                </div>
              )
            }
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
        </nav>
      </div>
    </div>
  )
}
