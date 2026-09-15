import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ParentView() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t')
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 링크입니다.')
      return
    }
    let cancelled = false
    async function load() {
      const { data: studentId, error: tokenErr } = await supabase.rpc('get_student_id_by_parent_token', {
        p_token: token,
      })
      if (cancelled) return
      if (tokenErr || !studentId) {
        setError('유효하지 않거나 만료된 링크입니다.')
        return
      }

      const [{ data: profileRows, error: profileErr }, { data: itemRows, error: itemErr }] = await Promise.all([
        supabase.rpc('get_student_profile', { p_student_id: studentId }),
        supabase.rpc('get_student_coaching_items', { p_student_id: studentId }),
      ])
      if (cancelled) return
      if (profileErr || itemErr || !profileRows?.length) {
        setError('학생 정보를 불러오지 못했습니다.')
        return
      }
      setProfile(profileRows[0])
      setItems(itemRows)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!profile && !error && <p>불러오는 중...</p>}

      {profile && (
        <>
          <h2>{profile.name} 학생 코칭 현황</h2>
          <p style={{ color: '#888' }}>
            {profile.class_name} / {profile.difficulty_tier ?? '레벨 미지정'}
          </p>

          <h3>최근 코칭 항목 (최근 30건)</h3>
          {items && items.length === 0 && <p>등록된 항목이 없습니다.</p>}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {items?.map((it) => (
              <li key={it.item_id} style={{ borderBottom: '1px solid #ddd', padding: '8px 0' }}>
                [{it.date}] {it.item_type} — {it.name}
                {it.page ? ` (p.${it.page})` : ''}
                <br />
                <span style={{ color: it.is_done ? 'green' : '#888' }}>{it.status_label ?? '미체크'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
