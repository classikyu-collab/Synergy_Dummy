import { supabase } from './supabaseClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

export async function isPushSubscribed() {
  if (!isPushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

// subjectType: 'student' | 'parent', subjectId: students.id, pin: 이미 검증된 4자리 PIN
export async function subscribeToPush({ subjectType, subjectId, pin }) {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' }
  if (Notification.permission === 'denied') return { ok: false, reason: 'denied' }

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: permission }
  }

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = sub.toJSON()
  const { data: ok, error } = await supabase.rpc('upsert_push_subscription', {
    p_subject_type: subjectType,
    p_subject_id: subjectId,
    p_pin: pin,
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  })
  if (error || !ok) {
    return { ok: false, reason: 'server' }
  }
  return { ok: true }
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    await supabase.rpc('delete_push_subscription', { p_endpoint: endpoint })
  } catch {
    // 구독 해지가 실패해도 UI는 계속 진행 — 다음 로그인 때 다시 시도 가능
  }
}
