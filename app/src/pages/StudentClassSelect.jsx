import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function StudentClassSelect() {
  const [classes, setClasses] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: rpcErr } = await supabase.rpc('list_active_classes')
      if (cancelled) return
      if (rpcErr) {
        setError('반 목록을 불러오지 못했습니다: ' + rpcErr.message)
        return
      }
      setClasses(data)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', fontFamily: 'sans-serif' }}>
      <h2>반을 선택하세요</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!classes && !error && <p>불러오는 중...</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {classes?.map((c) => (
          <li key={c.id} style={{ borderBottom: '1px solid #ddd', padding: '12px 0' }}>
            <Link to={`/student/${c.id}`} style={{ fontSize: 18 }}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
