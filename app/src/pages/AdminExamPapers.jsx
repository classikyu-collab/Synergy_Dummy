import { PageHeader, EmptyState } from '../lib/adminUI'
import { ADMIN_THEME as T } from '../lib/theme'

const EXAM_INFO = {
  'mock-exam': {
    title: '모의고사',
    subtitle: '온라인 OMR 시스템 소속 모의고사 시험지 관리',
    note: '온라인 OMR 시스템에서 쓰던 모의고사 데이터입니다. 이번 중간고사 기간에는 다른 시스템과 데이터 연동을 하지 않기로 결정했기 때문에, 지금은 메뉴 구조만 마련해둔 상태입니다.',
  },
  'school-exam': {
    title: '내신 시험지',
    subtitle: '내신시험지 시스템 소속 시험지 관리',
    note: '내신시험지 시스템에서 쓰던 데이터입니다. 이번 중간고사 기간에는 다른 시스템과 데이터 연동을 하지 않기로 결정했기 때문에, 지금은 메뉴 구조만 마련해둔 상태입니다.',
  },
  reading: {
    title: '빠른 해석 지문',
    subtitle: '빠른 해석 녹음실 시스템 소속 지문 관리',
    note: '빠른 해석 녹음실 시스템에서 쓰던 데이터입니다. 이번 중간고사 기간에는 다른 시스템과 데이터 연동을 하지 않기로 결정했기 때문에, 지금은 메뉴 구조만 마련해둔 상태입니다.',
  },
}

export default function AdminExamPapers({ examType }) {
  const info = EXAM_INFO[examType] ?? EXAM_INFO['mock-exam']

  return (
    <div>
      <PageHeader title={info.title} subtitle={info.subtitle} />
      <EmptyState>
        <p style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 700, color: T.ink }}>준비 중입니다</p>
        <p style={{ margin: 0, fontSize: 12.5, color: T.inkFaint, lineHeight: 1.5 }}>{info.note}</p>
      </EmptyState>
    </div>
  )
}
