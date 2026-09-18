const KEY = 'synapse_parent_children'

export function loadKnownChildren() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function rememberChild(id, name) {
  try {
    const list = loadKnownChildren().filter((c) => c.id !== id)
    list.unshift({ id, name })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)))
  } catch {
    // localStorage 접근 불가 시 무시 — 다음에도 이름 검색으로 진입 가능
  }
}
