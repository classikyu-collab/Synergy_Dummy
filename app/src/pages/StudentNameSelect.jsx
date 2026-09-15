import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function StudentNameSelect() {
  const { classId } = useParams()
  const [students, setStudents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: rpcErr } = await supabase.rpc('list_students_in_class', { p_class_id: classId })
      if (cancelled) return
      if (rpcErr) {
        setError('학생 목록을 불러오지 못했습니다: ' + rpcErr.message)
        return
      }
      setStudents(data)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [classId])

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', fontFamily: 'sans-serif' }}>
      <p>
        <Link to="/student">← 반 다시 선택</Link>
      </p>
      <h2>이름을 선택하세요</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!students && !error && <p>불러오는 중...</p>}
      {students && students.length === 0 && <p>재원 중인 학생이 없습니다.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {students?.map((s) => (
          <li key={s.id} style={{ borderBottom: '1px solid #ddd', padding: '12px 0' }}>
            <Link to={`/student/${classId}/${s.id}`} style={{ fontSize: 18 }}>
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
