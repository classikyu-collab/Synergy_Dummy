import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { PARENT_THEME as THEME } from '../lib/theme'
import { loadKnownChildren } from '../lib/parentChildren'

export default function ParentView() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)
  const knownChildren = loadKnownChildren()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const forceSearch = searchParams.get('new') === '1'

  // 홈 화면 아이콘은 iOS에서 start_url을 정확히 못 잡아줄 때가 있어 이 검색 화면으로
  // 떨어질 수 있다. 저장된 자녀가 한 명뿐이면 검색 없이 바로 그 화면으로 넘겨준다.
  useEffect(() => {
    if (!forceSearch && knownChildren.length === 1) {
      navigate(`/parent/${knownChildren[0].id}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults(null)
      return
    }
    debounceRef.current = setTimeout(async () => {
      const { data, error: searchErr } = await supabase.rpc('search_students_by_name', { p_query: query })
      if (searchErr) {
        setError('검색 중 오류가 발생했습니다: ' + searchErr.message)
        return
      }
      setError('')
      setResults(data)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  if (!forceSearch && knownChildren.length === 1) {
    return null
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 520,
        margin: '0 auto',
        background: THEME.bg,
        fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
        color: THEME.ink,
        minHeight: '100vh',
      }}
    >
      <div style={{ background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`, color: '#fff', padding: '22px 20px 26px', borderRadius: '0 0 28px 28px' }}>
        <p style={{ fontSize: 19, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.4 }}>자녀 코칭 현황 조회</p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', margin: 0 }}>자녀 이름을 입력해서 찾아주세요.</p>
      </div>

      <div style={{ padding: '18px 16px 28px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="학생 이름 검색"
          autoFocus
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: 16,
            border: `1px solid ${THEME.border}`,
            borderRadius: 14,
            boxSizing: 'border-box',
            marginBottom: 14,
            background: '#fff',
          }}
        />

        {!query.trim() && knownChildren.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: THEME.inkMuted, margin: '0 0 8px 2px' }}>최근 확인한 자녀</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {knownChildren.map((c) => (
                <Link
                  key={c.id}
                  to={`/parent/${c.id}`}
                  style={{
                    background: '#fff',
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 14px -10px rgba(43,38,33,0.16)',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</span>
                  <span style={{ fontSize: 12.5, color: THEME.primaryDark, fontWeight: 600 }}>바로 보기 →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}

        {results && results.length === 0 && (
          <p style={{ color: THEME.inkMuted, fontSize: 13 }}>검색 결과가 없습니다.</p>
        )}

        {results && results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((s) => (
              <Link
                key={s.id}
                to={`/parent/${s.id}`}
                style={{
                  background: '#fff',
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 14,
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 14px -10px rgba(43,38,33,0.16)',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</span>
                <span style={{ fontSize: 12.5, color: THEME.inkMuted }}>{s.class_name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
