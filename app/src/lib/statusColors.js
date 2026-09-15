// 원본 시스템(Stylesheet.html)에서 쓰던 상태 배지 색을 그대로 가져온 것
export const STATUS_COLORS = {
  done: { bg: '#d9f2e3', border: '#8fd4ab', text: '#186238' },
  pending: { bg: '#fbdcdc', border: '#eda3a3', text: '#a02323' },
  hold: { bg: '#ede9fe', border: '#c4b5fd', text: '#6d28d9' },
  makeup: { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' },
}

export function classifyStatus(label, isDone) {
  if (label && label.includes('보류')) return 'hold'
  return isDone ? 'done' : 'pending'
}

export function todayStr() {
  const t = new Date()
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}
