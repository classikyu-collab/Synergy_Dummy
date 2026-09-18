import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { PageHeader, PageLoading, PageError, EmptyState, TableCard, Th, Td, Tr, StatusBadge, cancelButtonStyle } from '../lib/adminUI'
import TodayCoachingGrid from './TodayCoachingGrid'
import ItemFormModal from './ItemFormModal'

export default function ClassDetail({ teacher }) {
  const { classId } = useParams()
  const [classInfo, setClassInfo] = useState(null)
  const [students, setStudents] = useState(null)
  const [error, setError] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [gridKey, setGridKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: cls, error: clsErr }, { data: studs, error: studErr }] = await Promise.all([
        supabase.from('classes').select('id, name, class_type, status').eq('id', classId).single(),
        supabase.from('students').select('id, name, difficulty_tier, status').eq('class_id', classId).order('name'),
      ])
      if (cancelled) return
      if (clsErr || studErr) {
        setError('데이터를 불러오지 못했습니다: ' + (clsErr || studErr).message)
        return
      }
      setClassInfo(cls)
      setStudents(studs)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [classId])

  return (
    <div>
      <p style={{ marginBottom: 4 }}>
        <Link to="/staff/classes" style={{ fontSize: 12.5, color: T.inkMuted }}>
          ← 반 목록으로
        </Link>
      </p>

      <PageError>{error}</PageError>
      {!classInfo && !error && <PageLoading />}

      {classInfo && (
        <>
          <PageHeader
            title={classInfo.name}
            subtitle={`${classInfo.class_type} · ${classInfo.status} · 학생 ${students?.length ?? 0}명`}
            action={
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/staff/classes/${classId}/homework`} style={{ ...cancelButtonStyle, flex: 'none', textDecoration: 'none', display: 'inline-block', fontSize: 13, background: T.primaryTint, color: T.primaryDark, borderColor: T.primaryTint }}>
                  숙제 등록
                </Link>
                <Link to={`/staff/mock-exam-review?class=${classId}`} style={{ ...cancelButtonStyle, flex: 'none', textDecoration: 'none', display: 'inline-block', fontSize: 13 }}>
                  모의고사 결과
                </Link>
                <Link to={`/staff/school-exam-review?class=${classId}`} style={{ ...cancelButtonStyle, flex: 'none', textDecoration: 'none', display: 'inline-block', fontSize: 13 }}>
                  내신 시험지 검토
                </Link>
                <Link to={`/staff/reading-review?class=${classId}`} style={{ ...cancelButtonStyle, flex: 'none', textDecoration: 'none', display: 'inline-block', fontSize: 13 }}>
                  빠른 해석 녹음 채점
                </Link>
              </div>
            }
          />

          <p style={{ fontSize: 14, fontWeight: 700, margin: '24px 0 10px' }}>학생 목록</p>
          {students && students.length === 0 && <EmptyState>학생이 없습니다.</EmptyState>}
          {students && students.length > 0 && (
            <TableCard>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    <Th>이름</Th>
                    <Th>레벨</Th>
                    <Th>재원상태</Th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <Tr key={s.id}>
                      <Td style={{ fontWeight: 700, color: T.ink }}>{s.name}</Td>
                      <Td>{s.difficulty_tier ?? '-'}</Td>
                      <Td>
                        <StatusBadge positive={s.status === '재원'}>{s.status}</StatusBadge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          )}

          <p style={{ fontSize: 14, fontWeight: 700, margin: '28px 0 10px' }}>오늘 코칭 리스트</p>

          {students && (
            <TodayCoachingGrid
              classId={classId}
              students={students}
              teacherId={teacher.id}
              refreshKey={gridKey}
              onEdit={setEditingItem}
              onChanged={() => setGridKey((k) => k + 1)}
            />
          )}

          {editingItem && students && (
            <ItemFormModal
              classId={classId}
              students={students}
              item={editingItem}
              onClose={() => setEditingItem(null)}
              onSaved={() => {
                setEditingItem(null)
                setGridKey((k) => k + 1)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
