import { ADMIN_THEME as T } from '../lib/theme'
import { ToastProvider } from '../lib/toast'
import StaffTopNav from './StaffTopNav'

export default function StaffShell({ teacher, onLoggedOut, children }) {
  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', background: T.bg, color: T.ink, fontFamily: "'Noto Sans KR', -apple-system, sans-serif" }}>
        <StaffTopNav teacher={teacher} onLoggedOut={onLoggedOut} />
        <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>{children}</div>
      </div>
    </ToastProvider>
  )
}
