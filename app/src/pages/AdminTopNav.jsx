import { useEffect, useRef, useState } from 'react'
import { ADMIN_THEME as T } from '../lib/theme'

const GROUPS = [
  {
    label: '사용자 관리',
    items: [
      { label: '직원 계정', key: 'staff', ready: true },
      { label: '반 관리', key: 'classes', ready: true },
      { label: '학생 관리', key: 'students', ready: true },
      { label: '학부모 관리', key: 'parents', ready: true },
    ],
  },
  {
    label: '운영',
    items: [
      { label: '시간표 관리', key: 'schedule', ready: true },
      { label: '직원 공지', key: 'staff-notices', ready: true },
      { label: '학생/학부모 공지', key: 'student-notices', ready: true },
    ],
  },
  {
    label: '시험지 관리',
    items: [
      { label: '모의고사', key: 'mock-exam', ready: true },
      { label: '내신 시험지', key: 'school-exam', ready: true },
      { label: '빠른 해석 지문', key: 'reading', ready: true },
    ],
  },
  {
    label: '시스템',
    items: [{ label: '데이터 점검', key: 'data-check', ready: false }],
  },
]

export default function AdminTopNav({ active, admin, onLoggedOut, onChangePassword, onNavigate }) {
  const [openGroup, setOpenGroup] = useState(null)
  const navRef = useRef(null)

  useEffect(() => {
    if (!openGroup) return
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openGroup])

  return (
    <div
      ref={navRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: 56,
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: -0.2 }}>SYNAPSE</span>
        </div>

        <nav style={{ display: 'flex', gap: 4 }}>
          <TopTab label="개요" activeSelf={active === 'overview'} />
          {GROUPS.map((g) => (
            <div key={g.label} style={{ position: 'relative' }}>
              <div onClick={() => setOpenGroup(openGroup === g.label ? null : g.label)}>
                <TopTab label={g.label} caret activeSelf={g.items.some((i) => i.key === active)} />
              </div>
              {openGroup === g.label && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    boxShadow: '0 12px 28px -8px rgba(20,20,50,0.18)',
                    padding: 6,
                    minWidth: 180,
                    zIndex: 50,
                  }}
                >
                  {g.items.map((item) => (
                    <div
                      key={item.key}
                      title={item.ready ? undefined : '준비 중'}
                      onClick={() => {
                        if (!item.ready) return
                        setOpenGroup(null)
                        onNavigate(item.key)
                      }}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: item.key === active ? 700 : 500,
                        color: !item.ready ? T.inkFaint : item.key === active ? T.primaryDark : T.inkMuted,
                        background: item.key === active ? T.primaryTint : 'transparent',
                        cursor: item.ready ? 'pointer' : 'default',
                        opacity: item.ready ? 1 : 0.55,
                      }}
                    >
                      {item.label}
                      {!item.ready && <span style={{ fontSize: 10.5, marginLeft: 6 }}>준비 중</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.inkMuted }}>{admin.name}님</span>
        <button onClick={onChangePassword} style={navButtonStyle}>
          비밀번호 변경
        </button>
        <button onClick={onLoggedOut} style={navButtonStyle}>
          로그아웃
        </button>
      </div>
    </div>
  )
}

function TopTab({ label, caret, activeSelf }) {
  return (
    <div
      style={{
        padding: '0 12px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 13.5,
        fontWeight: activeSelf ? 700 : 600,
        color: activeSelf ? 'var(--admin-primary)' : 'var(--admin-ink-muted)',
        borderBottom: activeSelf ? '2px solid var(--admin-primary)' : '2px solid transparent',
        cursor: 'pointer',
      }}
    >
      {label}
      {caret && <span style={{ fontSize: 9 }}>▾</span>}
    </div>
  )
}

const navButtonStyle = {
  fontSize: 12,
  fontWeight: 600,
  padding: '7px 12px',
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: T.surface,
  color: T.inkMuted,
  cursor: 'pointer',
}
