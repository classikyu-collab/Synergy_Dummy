import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ItemChecklist from './ItemChecklist'

export default function ClassDetail({ teacher }) {
  const { classId } = useParams()
  const [classInfo, setClassInfo] = useState(null)
  const [students, setStudents] = useState(null)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: cls, error: clsErr }, { data: studs, error: studErr }, { data: its, error: itemErr }] =
        await Promise.all([
          supabase.from('classes').select('id, name, class_type, status').eq('id', classId).single(),
          supabase
            .from('students')
            .select('id, name, difficulty_tier, status')
            .eq('class_id', classId)
            .order('name'),
          supabase
            .from('coaching_items')
            .select('id, date, item_type, name, page, target_mode')
            .eq('class_id', classId)
            .is('deleted_at', null)
            .order('date', { ascending: false })
            .limit(20),
        ])

      if (cancelled) return
      if (clsErr || studErr || itemErr) {
        setError('데이터를 불러오지 못했습니다: ' + (clsErr || studErr || itemErr).message)
        return
      }
      setClassInfo(cls)
      setStudents(studs)
      setItems(its)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [classId])

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <p>
        <Link to="/staff">← 반 목록으로</Link>
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!classInfo && !error && <p>불러오는 중...</p>}

      {classInfo && (
        <>
          <h2>
            {classInfo.name} <span style={{ color: '#888', fontSize: 16 }}>({classInfo.class_type})</span>
          </h2>

          <h3>학생 목록 ({students?.length ?? 0}명)</h3>
          {students && students.length === 0 && <p>학생이 없습니다.</p>}
          <ul>
            {students?.map((s) => (
              <li key={s.id}>
                {s.name} — {s.difficulty_tier ?? '레벨 미지정'} / {s.status}
              </li>
            ))}
          </ul>

          <h3>최근 코칭 항목 (최대 20건)</h3>
          <p style={{ color: '#888', fontSize: 13 }}>항목을 클릭하면 학생별 완료 체크를 할 수 있습니다.</p>
          {items && items.length === 0 && <p>등록된 항목이 없습니다.</p>}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {items?.map((it) => (
              <li key={it.id} style={{ borderBottom: '1px solid #ddd', padding: '6px 0' }}>
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === it.id ? null : it.id)}
                >
                  {expandedId === it.id ? '▼' : '▶'} [{it.date}] {it.item_type} — {it.name}
                  {it.page ? ` (p.${it.page})` : ''}
                </div>
                {expandedId === it.id && <ItemChecklist itemId={it.id} teacherId={teacher.id} />}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
