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
    <div style={{ background: '#fff7ed', border: '1px solid #fdd9a8', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
      <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#92600a' }}>공지사항</p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {announcements.map((a) => (
          <li key={a.id} style={{ whiteSpace: 'pre-wrap', marginBottom: 4, fontSize: 13, color: '#7a4f08', lineHeight: 1.5 }}>
            {a.content}
          </li>
        ))}
      </ul>
    </div>
  )
}
