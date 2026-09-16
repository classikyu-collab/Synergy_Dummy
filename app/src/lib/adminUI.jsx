import { ADMIN_THEME as T } from './theme'

// Shared building blocks for the admin dashboard pages (직원/반/학생/학부모 관리 등).
// Centralized so a style change here propagates everywhere instead of being
// re-applied file by file.

export const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 13.5,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  boxSizing: 'border-box',
  background: '#fff',
  color: T.ink,
  colorScheme: 'light',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export function Input(props) {
  return <input className="admin-input" style={inputStyle} {...props} />
}

export function Select(props) {
  return <select className="admin-select" style={inputStyle} {...props} />
}

export const primaryButtonStyle = {
  fontSize: 12.5,
  fontWeight: 700,
  padding: '9px 16px',
  borderRadius: 10,
  border: 'none',
  background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
  color: '#fff',
  cursor: 'pointer',
  boxShadow: '0 4px 10px -4px rgba(67,65,201,0.5)',
  transition: 'filter 0.15s',
}

export function PrimaryButton({ children, style, disabled, ...rest }) {
  return (
    <button
      className="admin-btn-primary"
      disabled={disabled}
      style={{ ...primaryButtonStyle, ...disabledStyle(disabled), ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}

export const cancelButtonStyle = {
  flex: 1,
  padding: '10px',
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: '#fff',
  color: T.inkMuted,
  fontWeight: 600,
  cursor: 'pointer',
  colorScheme: 'light',
  transition: 'background 0.15s',
}

export function GhostButton({ children, style, disabled, ...rest }) {
  return (
    <button
      className="admin-btn-ghost"
      disabled={disabled}
      style={{ ...cancelButtonStyle, flex: 'none', ...disabledStyle(disabled), ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}

export const dangerButtonStyle = {
  width: '100%',
  padding: '9px',
  borderRadius: 8,
  border: `1px solid ${T.danger.bg}`,
  background: T.danger.bg,
  color: T.danger.text,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'filter 0.15s',
}

export function DangerButton({ children, style, disabled, ...rest }) {
  return (
    <button
      className="admin-btn-danger"
      disabled={disabled}
      style={{ ...dangerButtonStyle, ...disabledStyle(disabled), ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}

export const smallButtonStyle = {
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 12px',
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: '#fff',
  color: T.inkMuted,
  cursor: 'pointer',
  colorScheme: 'light',
  transition: 'background 0.15s',
}

export function SmallButton({ children, style, disabled, ...rest }) {
  return (
    <button
      className="admin-btn-ghost"
      disabled={disabled}
      style={{ ...smallButtonStyle, ...disabledStyle(disabled), ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}

function disabledStyle(disabled) {
  return disabled ? { opacity: 0.55, cursor: 'default' } : {}
}

export function Th({ children, w, sort, onClick }) {
  return (
    <th
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '12px 16px',
        fontSize: 11.5,
        fontWeight: 700,
        color: T.inkFaint,
        width: w,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {children}
      {onClick && <span style={{ marginLeft: 4, opacity: sort ? 1 : 0.35 }}>{sort === 'desc' ? '▼' : '▲'}</span>}
    </th>
  )
}

export function Td({ children, style }) {
  return <td style={{ padding: '13px 16px', fontSize: 13, color: T.inkMuted, ...style }}>{children}</td>
}

export function Tr({ children, style }) {
  return (
    <tr className="admin-row" style={{ borderTop: `1px solid ${T.border}`, ...style }}>
      {children}
    </tr>
  )
}

export function Badge({ children, bg, color }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: bg, color }}>
      {children}
    </span>
  )
}

export function StatusBadge({ children, positive }) {
  return (
    <Badge bg={positive ? T.success.bg : T.danger.bg} color={positive ? T.success.text : T.danger.text}>
      {children}
    </Badge>
  )
}

export function TableCard({ children }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 8px -4px rgba(30,30,80,0.06)',
      }}
    >
      {children}
    </div>
  )
}

// 항목 수가 많아질 때 표 하나를 세로로 길게 늘어뜨리는 대신 좌우 2단으로 쪼개서 보여준다
// (학부모 관리에서 먼저 도입, 직원/반 관리에도 동일하게 적용).
export function splitInHalf(list) {
  const mid = Math.ceil(list.length / 2)
  return [list.slice(0, mid), list.slice(mid)]
}

export function TwoColTables({ items, renderTable }) {
  const halves = splitInHalf(items)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {halves.map((half, i) => (
        <TableCard key={i}>{renderTable(half, i)}</TableCard>
      ))}
    </div>
  )
}

export function PageLoading({ label = '불러오는 중...' }) {
  return <p style={{ color: T.inkFaint, fontSize: 13.5 }}>{label}</p>
}

export function PageError({ children }) {
  if (!children) return null
  return (
    <p style={{ margin: '0 0 16px', padding: '10px 14px', fontSize: 13, borderRadius: 10, background: T.danger.bg, color: T.danger.text }}>
      {children}
    </p>
  )
}

export function EmptyState({ children }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, textAlign: 'center', color: T.inkFaint, fontSize: 13 }}>
      {children}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: T.inkMuted, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

export function ModalWrap({ onClose, children, width = 400 }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,40,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 24px 48px rgba(15,12,8,0.16)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalTitle({ children }) {
  return <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: T.ink }}>{children}</h3>
}

export function InlineError({ children }) {
  if (!children) return null
  return (
    <p style={{ margin: '0 0 12px', padding: '8px 12px', fontSize: 12.5, borderRadius: 8, background: T.danger.bg, color: T.danger.text }}>
      {children}
    </p>
  )
}

export function InlineSuccess({ children }) {
  if (!children) return null
  return (
    <p style={{ margin: '0 0 12px', padding: '8px 12px', fontSize: 12.5, borderRadius: 8, background: T.success.bg, color: T.success.text }}>
      {children}
    </p>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{title}</h1>
        {subtitle && <p style={{ margin: 0, fontSize: 13.5, color: T.inkFaint }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
