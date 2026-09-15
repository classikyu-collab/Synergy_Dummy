import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ClassList({ teacher, onLoggedOut }) {
  const [classes, setClasses] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: fetchError } = await supabase
        .from('classes')
        .select('id, name, class_type, status')
        .order('name')
      if (cancelled) return
      if (fetchError) {
        setError('반 목록을 불러오지 못했습니다: ' + fetchError.message)
      } else {
        setClasses(data)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    onLoggedOut()
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{teacher.name}님의 반 목록</h2>
        <button onClick={handleLogout} style={{ padding: '6px 10px' }}>
          로그아웃
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!classes && !error && <p>불러오는 중...</p>}
      {classes && classes.length === 0 && <p>조회 가능한 반이 없습니다.</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {classes?.map((c) => (
          <li key={c.id} style={{ borderBottom: '1px solid #ddd', padding: '10px 0' }}>
            <Link to={`classes/${c.id}`}>
              {c.name} <span style={{ color: '#888' }}>({c.class_type}, {c.status})</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
