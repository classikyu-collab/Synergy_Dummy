const KEY_PREFIX = 'synapse_student_ann_seen_'

export function loadSeenIds(studentId) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + studentId)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function markAnnouncementSeen(studentId, id) {
  const set = loadSeenIds(studentId)
  if (set.has(id)) return set
  set.add(id)
  try {
    localStorage.setItem(KEY_PREFIX + studentId, JSON.stringify([...set]))
  } catch {
    // localStorage unavailable — badge just won't persist across sessions
  }
  return set
}
