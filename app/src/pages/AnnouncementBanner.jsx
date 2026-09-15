import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.rpc('list_active_announcements').then(({ data }) => {
      if (!cancelled) setAnnouncements(data ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!announcements || announcements.length === 0) return null

  return (
    <div style={{ background: '#fff8e1', border: '1px solid #e0c060', borderRadius: 6, padding: 12, marginBottom: 16 }}>
      <strong>공지사항</strong>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {announcements.map((a) => (
          <li key={a.id} style={{ whiteSpace: 'pre-wrap', marginBottom: 4 }}>
            {a.content}
          </li>
        ))}
      </ul>
    </div>
  )
}
