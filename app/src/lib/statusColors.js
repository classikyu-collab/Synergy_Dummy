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

// 로컬 타임존 기준 YYYY-MM-DD. `date.toISOString().slice(0,10)`은 UTC로 변환하기 때문에
// 한국 시간 자정~오전 9시 사이에는 하루 전 날짜가 나오는 버그가 있어 쓰지 않는다.
export function toDateStr(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

export function todayStr() {
  return toDateStr(new Date())
}
