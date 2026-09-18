import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { PageHeader, PageLoading, PageError, EmptyState, StatusBadge, Badge } from '../lib/adminUI'
import AnnouncementBanner from './AnnouncementBanner'

export default function ClassList({ teacher }) {
  const [classes, setClasses] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: fetchError } = await supabase.from('classes').select('id, name, class_type, status').order('name')
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

  return (
    <div>
      <PageHeader title={`${teacher.name}님의 반 목록`} subtitle="담당 반을 선택해 코칭 항목과 시험지/녹음 제출을 확인하세요." />

      <AnnouncementBanner />

      <PageError>{error}</PageError>
      {!classes && !error && <PageLoading />}
      {classes && classes.length === 0 && <EmptyState>조회 가능한 반이 없습니다.</EmptyState>}

      {classes && classes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {classes.map((c) => (
            <Link
              key={c.id}
              to={`/staff/classes/${c.id}`}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                boxShadow: '0 2px 8px -4px rgba(30,30,80,0.08)',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{c.name}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Badge bg={T.primaryTint} color={T.primaryDark}>
                  {c.class_type}
                </Badge>
                <StatusBadge positive={c.status === '운영중'}>{c.status}</StatusBadge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
