const KEY_PREFIX = { student: 'synapse_student_ann_seen_', parent: 'synapse_parent_ann_seen_' }

export function loadSeenIds(studentId, kind = 'student') {
  try {
    const raw = localStorage.getItem(KEY_PREFIX[kind] + studentId)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function markAnnouncementSeen(studentId, id, kind = 'student') {
  const set = loadSeenIds(studentId, kind)
  if (set.has(id)) return set
  set.add(id)
  try {
    localStorage.setItem(KEY_PREFIX[kind] + studentId, JSON.stringify([...set]))
  } catch {
    // localStorage unavailable — badge just won't persist across sessions
  }
  return set
}
