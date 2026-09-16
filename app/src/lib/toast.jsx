import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

const COLORS = {
  success: { bg: '#1f8a55', text: '#fff' },
  error: { bg: '#c53030', text: '#fff' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const showToast = useCallback((message, type = 'success') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        style={{
          position: 'fixed',
          left: 20,
          bottom: 20,
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: COLORS[t.type]?.bg ?? COLORS.success.bg,
              color: COLORS[t.type]?.text ?? '#fff',
              fontSize: 13,
              fontWeight: 600,
              padding: '11px 16px',
              borderRadius: 10,
              boxShadow: '0 8px 20px -6px rgba(15,12,8,0.35)',
              maxWidth: 360,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast는 ToastProvider 내부에서만 사용할 수 있습니다.')
  }
  return ctx
}
