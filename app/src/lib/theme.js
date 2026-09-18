export const STUDENT_THEME = {
  primary: '#5b5bf0',
  primaryDark: '#4341c9',
  bg: '#f3f4fb',
  ink: '#1f2333',
  inkMuted: '#8388a0',
  examBorder: '#f0975b',
}

// 관리자/강사 화면은 시스템 다크모드 설정을 따른다 (index.css의 --admin-* CSS 변수로 실제 값 정의).
export const ADMIN_THEME = {
  primary: 'var(--admin-primary)',
  primaryDark: 'var(--admin-primary-dark)',
  primaryTint: 'var(--admin-primary-tint)',
  bg: 'var(--admin-bg)',
  surface: 'var(--admin-surface)',
  border: 'var(--admin-border)',
  ink: 'var(--admin-ink)',
  inkMuted: 'var(--admin-ink-muted)',
  inkFaint: 'var(--admin-ink-faint)',
  success: { bg: 'var(--admin-success-bg)', text: 'var(--admin-success-text)' },
  danger: { bg: 'var(--admin-danger-bg)', text: 'var(--admin-danger-text)' },
  modalBackdrop: 'var(--admin-modal-backdrop)',
}

// A안(레이아웃: 그라데이션 헤더 + 카드형 2x2 바로가기)의 구조에 B안(따뜻한 아이보리 톤)의
// 색감을 합친 버전. 2026-09-18 학부모 홈 화면 디자인 시안 논의에서 확정.
export const PARENT_THEME = {
  primary: '#3f6259',
  primaryDark: '#26433c',
  bg: '#faf8f3',
  ink: '#2b2621',
  inkMuted: '#8a8171',
  border: '#e8e1d3',
  examBorder: '#a8623b',
  makeup: { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' },
}
