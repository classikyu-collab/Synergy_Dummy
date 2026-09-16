import { ADMIN_THEME as T } from '../lib/theme'
import { ToastProvider } from '../lib/toast'
import AdminTopNav from './AdminTopNav'

export default function AdminShell({ active, admin, onLoggedOut, onChangePassword, onNavigate, children }) {
  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', background: T.bg, color: T.ink, fontFamily: "'Noto Sans KR', -apple-system, sans-serif" }}>
        <AdminTopNav active={active} admin={admin} onLoggedOut={onLoggedOut} onChangePassword={onChangePassword} onNavigate={onNavigate} />
        <div style={{ padding: '32px 40px', maxWidth: 1440, margin: '0 auto' }}>{children}</div>
      </div>
    </ToastProvider>
  )
}
