import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const SYSTEM_LABEL = {
  빠른해석녹음실: { label: '빠른 해석 녹음실', bg: '#ede9fe', text: '#6d28d9' },
  온라인_OMR: { label: '온라인 OMR', bg: '#dbeafe', text: '#1d4ed8' },
  내신시험지: { label: '내신시험지', bg: '#d9f2e3', text: '#186238' },
}

export default function AdminStudents() {
  const [students, setStudents] = useState(null)
  const [links, setLinks] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: studentRows, error: studentErr }, { data: linkRows, error: linkErr }] = await Promise.all([
        supabase
          .from('students')
          .select('id, name, difficulty_tier, status, classes(name)')
          .order('name'),
        supabase.from('student_external_ids').select('student_id, source_system, external_id, external_class_name'),
      ])
      if (cancelled) return
      if (studentErr || linkErr) {
        setError('불러오지 못했습니다: ' + (studentErr || linkErr).message)
        return
      }
      setStudents(studentRows)
      setLinks(linkRows)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <p style={{ color: 'red' }}>{error}</p>
  if (!students || !links) return <p>불러오는 중...</p>

  const linksByStudent = {}
  links.forEach((l) => {
    if (!linksByStudent[l.student_id]) linksByStudent[l.student_id] = []
    linksByStudent[l.student_id].push(l)
  })

  return (
    <div>
      <h3>학생 통합 현황</h3>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
        각 학생이 다른 시스템(빠른 해석 녹음실 등)에서도 연동된 계정을 갖고 있는지 보여줍니다. 연동 정보는 관리자가 확인한 것만 표시됩니다.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #888' }}>
            <th style={{ padding: 6 }}>이름</th>
            <th style={{ padding: 6 }}>반</th>
            <th style={{ padding: 6 }}>레벨</th>
            <th style={{ padding: 6 }}>재원상태</th>
            <th style={{ padding: 6 }}>연동된 시스템</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const studentLinks = linksByStudent[s.id] ?? []
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 6 }}>{s.name}</td>
                <td style={{ padding: 6 }}>{s.classes?.name ?? '-'}</td>
                <td style={{ padding: 6 }}>{s.difficulty_tier ?? '-'}</td>
                <td style={{ padding: 6 }}>{s.status}</td>
                <td style={{ padding: 6 }}>
                  {studentLinks.length === 0 && <span style={{ color: '#888', fontSize: 12 }}>연동 없음</span>}
                  {studentLinks.map((l) => {
                    const meta = SYSTEM_LABEL[l.source_system] ?? { label: l.source_system, bg: '#eee', text: '#333' }
                    return (
                      <span
                        key={l.source_system + l.external_id}
                        title={`${l.external_id}${l.external_class_name ? ' · ' + l.external_class_name : ''}`}
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: meta.bg,
                          color: meta.text,
                          marginRight: 4,
                        }}
                      >
                        {meta.label}
                      </span>
                    )
                  })}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
