import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ADMIN_THEME as T } from '../lib/theme'

const GROUPS = [
  {
    label: '학생',
    items: [{ label: '학생 리포트', path: '/staff/student-report', ready: false }],
  },
  {
    label: '시험/녹음 검토',
    items: [
      { label: '모의고사 결과', path: '/staff/mock-exam-review', ready: true },
      { label: '내신 시험지 검토', path: '/staff/school-exam-review', ready: true },
      { label: '빠른 해석 채점', path: '/staff/reading-review', ready: true },
      { label: '등급비율표', path: '/staff/grade-ratios', ready: false },
    ],
  },
  {
    label: '운영',
    items: [{ label: '오늘 할 일', path: '/staff/today', ready: false }],
  },
]

export default function StaffTopNav({ teacher, onLoggedOut }) {
  const [openGroup, setOpenGroup] = useState(null)
  const { pathname } = useLocation()
  const navRef = useRef(null)

  const classesActive = pathname.startsWith('/staff/classes')

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
        <Link to="/staff" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`, flexShrink: 0 }} />
          <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: -0.2, color: T.ink }}>SYNAPSE</span>
        </Link>

        <nav style={{ display: 'flex', gap: 4 }}>
          <Link to="/staff/classes" style={{ textDecoration: 'none' }}>
            <TopTab label="반 목록" activeSelf={classesActive} />
          </Link>
          {GROUPS.map((g) => (
            <div key={g.label} style={{ position: 'relative' }}>
              <div onClick={() => setOpenGroup(openGroup === g.label ? null : g.label)}>
                <TopTab label={g.label} caret activeSelf={g.items.some((i) => pathname.startsWith(i.path))} />
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
                    minWidth: 190,
                    zIndex: 50,
                  }}
                >
                  {g.items.map((item) => {
                    const isActive = pathname.startsWith(item.path)
                    const content = (
                      <div
                        style={{
                          padding: '9px 12px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: isActive ? 700 : 500,
                          color: !item.ready ? T.inkFaint : isActive ? T.primaryDark : T.inkMuted,
                          background: isActive ? T.primaryTint : 'transparent',
                          cursor: item.ready ? 'pointer' : 'default',
                          opacity: item.ready ? 1 : 0.55,
                        }}
                      >
                        {item.label}
                        {!item.ready && <span style={{ fontSize: 10.5, marginLeft: 6 }}>준비 중</span>}
                      </div>
                    )
                    if (!item.ready) {
                      return (
                        <div key={item.path} title="준비 중">
                          {content}
                        </div>
                      )
                    }
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setOpenGroup(null)} style={{ textDecoration: 'none' }}>
                        {content}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.inkMuted }}>{teacher.name}님</span>
        <Link to="/staff/change-password" style={navButtonStyle}>
          비밀번호 변경
        </Link>
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
  textDecoration: 'none',
  display: 'inline-block',
}
