import { Link } from 'react-router-dom'
import { ADMIN_THEME as T } from '../lib/theme'
import { PageHeader } from '../lib/adminUI'
import AnnouncementBanner from './AnnouncementBanner'

// 임시 홈 화면. 자주 쓰는 메뉴 바로가기 + 공지사항만 우선 배치했고, 구성은 아직 정리 전.
const SHORTCUTS = [
  { label: '반 목록', desc: '담당 반 학생·코칭 항목 관리', to: '/staff/classes' },
  { label: '모의고사 결과', desc: '응시 결과 조회', to: '/staff/mock-exam-review' },
  { label: '내신 시험지 검토', desc: '제출 답안·오류 신고 확인', to: '/staff/school-exam-review' },
  { label: '빠른 해석 채점', desc: '제출 음원 듣고 채점', to: '/staff/reading-review' },
]

export default function StaffHome({ teacher }) {
  return (
    <div>
      <PageHeader title={`${teacher.name}님, 안녕하세요`} subtitle="자주 쓰는 메뉴로 바로 이동할 수 있어요." />

      <AnnouncementBanner />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {SHORTCUTS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              boxShadow: '0 2px 8px -4px rgba(30,30,80,0.08)',
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{s.label}</span>
            <span style={{ fontSize: 12.5, color: T.inkMuted }}>{s.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
