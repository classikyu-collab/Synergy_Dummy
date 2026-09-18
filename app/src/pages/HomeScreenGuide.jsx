import { useState } from 'react'

export function isStandaloneDisplay() {
  try {
    if (window.navigator.standalone) return true // iOS Safari
    return window.matchMedia?.('(display-mode: standalone)')?.matches ?? false
  } catch {
    return false
  }
}

export function hasSeenHomeGuide(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function markHomeGuideSeen(key) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // localStorage 접근 불가 시 무시 (다음 방문 때 다시 뜰 수 있음)
  }
}

function detectDevice() {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

const STEPS = {
  ios: [
    ['⋯', '주소창 옆이나 화면 아래쪽의 공유 버튼(네모 위로 화살표)을 눌러요'],
    ['➕', '아래로 내리거나 "더 보기"에서 "홈 화면에 추가"를 찾아 선택해요'],
    ['✅', '오른쪽 위 "추가"를 누르면 끝!'],
  ],
  android: [
    ['⋮', '오른쪽 위 점 3개 메뉴를 눌러요'],
    ['➕', '"홈 화면에 추가"를 찾아 선택해요'],
    ['✅', '"추가"를 누르면 끝!'],
  ],
}

export default function HomeScreenGuideModal({ theme, onDone }) {
  const [device, setDevice] = useState(detectDevice)
  const isDesktop = device === 'desktop'
  const steps = STEPS[device] ?? STEPS.android

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', background: 'rgba(20,20,40,0.45)' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          margin: '0 auto',
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          padding: '24px 22px 28px',
          fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
        }}
      >
        <p style={{ fontSize: 17, fontWeight: 800, color: theme.ink, margin: '0 0 4px' }}>📱 홈 화면에 추가해보세요</p>
        <p style={{ fontSize: 13, color: theme.inkMuted, margin: '0 0 18px', lineHeight: 1.5 }}>
          {isDesktop
            ? '휴대폰으로 접속하시면 앱처럼 홈 화면에 아이콘을 추가할 수 있어요. 다음부터는 아이콘만 눌러서 바로 들어올 수 있어요.'
            : '다음부터 매번 주소를 입력하지 않아도, 아이콘만 눌러서 바로 들어올 수 있어요.'}
        </p>

        {!isDesktop && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: theme.bg,
                    color: theme.primaryDark,
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{s[0]}</span>
                <span style={{ fontSize: 13.5, color: theme.ink, lineHeight: 1.4 }}>{s[1]}</span>
              </div>
            ))}
          </div>
        )}

        {!isDesktop && (
          <button
            type="button"
            onClick={() => setDevice(device === 'ios' ? 'android' : 'ios')}
            style={{ display: 'block', margin: '0 0 18px', background: 'none', border: 'none', color: theme.inkMuted, fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
          >
            {device === 'ios' ? '안드로이드 폰이신가요? 안내 바꿔보기' : '아이폰이신가요? 안내 바꿔보기'}
          </button>
        )}

        <button
          type="button"
          onClick={onDone}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 14,
            border: 'none',
            background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`,
            color: '#fff',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          완료
        </button>
      </div>
    </div>
  )
}
