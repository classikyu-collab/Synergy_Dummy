import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ADMIN_THEME as T } from '../lib/theme'
import { useToast } from '../lib/toast'
import {
  PageHeader,
  PageLoading,
  PageError,
  EmptyState,
  PrimaryButton,
  GhostButton,
  SmallButton,
  DangerButton,
  Field,
  ModalWrap,
  ModalTitle,
  InlineError,
} from '../lib/adminUI'

export default function AdminStaffAnnouncements() {
  const showToast = useToast()
  const [announcements, setAnnouncements] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

  async function reload() {
    const { data, error: fetchErr } = await supabase
      .from('announcements')
      .select('id, content, is_active, created_at')
      .order('created_at', { ascending: false })
    if (fetchErr) {
      setError('공지사항을 불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setAnnouncements(data)
  }

  useEffect(() => {
    reload()
  }, [])

  async function toggleActive(a) {
    const { error: dbErr } = await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id)
    if (dbErr) {
      showToast('상태 변경 실패: ' + dbErr.message, 'error')
      return
    }
    showToast(a.is_active ? '공지사항을 비활성화했습니다.' : '공지사항을 다시 활성화했습니다.')
    reload()
  }

  async function handleDelete(a) {
    if (!confirm('이 공지사항을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return
    const { error: dbErr } = await supabase.from('announcements').delete().eq('id', a.id)
    if (dbErr) {
      showToast('삭제 실패: ' + dbErr.message, 'error')
      return
    }
    showToast('공지사항이 삭제되었습니다.')
    reload()
  }

  return (
    <div>
      <PageHeader
        title="직원 대상 공지사항"
        subtitle="관리자가 강사들에게 보내는 공지입니다. 강사 화면 상단 배너로 표시됩니다."
        action={<PrimaryButton onClick={() => setCreating(true)}>+ 공지 등록</PrimaryButton>}
      />

      <PageError>{error}</PageError>
      {!announcements && !error && <PageLoading />}

      {announcements && announcements.length === 0 && <EmptyState>등록된 공지사항이 없습니다.</EmptyState>}

      {announcements && announcements.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {announcements.map((a) => (
            <div
              key={a.id}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: '14px 18px',
                opacity: a.is_active ? 1 : 0.55,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: a.is_active ? T.success.bg : T.danger.bg,
                        color: a.is_active ? T.success.text : T.danger.text,
                      }}
                    >
                      {a.is_active ? '게시중' : '비활성'}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.inkFaint }}>{new Date(a.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: T.ink, whiteSpace: 'pre-wrap' }}>{a.content}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <SmallButton onClick={() => setEditing(a)}>수정</SmallButton>
                  <SmallButton onClick={() => toggleActive(a)}>{a.is_active ? '비활성화' : '활성화'}</SmallButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <AnnouncementModal
          onClose={() => setCreating(false)}
          onDone={(msg) => {
            setCreating(false)
            showToast(msg)
            reload()
          }}
        />
      )}

      {editing && (
        <AnnouncementModal
          announcement={editing}
          onClose={() => setEditing(null)}
          onDone={(msg) => {
            setEditing(null)
            showToast(msg)
            reload()
          }}
          onDelete={() => {
            setEditing(null)
            handleDelete(editing)
          }}
        />
      )}
    </div>
  )
}

const textareaStyle = {
  width: '100%',
  minHeight: 120,
  padding: '10px 12px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  boxSizing: 'border-box',
  background: T.surface,
  color: T.ink,
  colorScheme: 'light',
  resize: 'vertical',
}

function AnnouncementModal({ announcement, onClose, onDone, onDelete }) {
  const [content, setContent] = useState(announcement?.content ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setLocalError('')
    setSubmitting(true)
    const payload = { content: content.trim() }
    const query = announcement
      ? supabase.from('announcements').update(payload).eq('id', announcement.id)
      : supabase.from('announcements').insert({ ...payload, is_active: true })
    const { error: dbErr } = await query
    setSubmitting(false)
    if (dbErr) {
      setLocalError((announcement ? '저장 실패: ' : '등록 실패: ') + dbErr.message)
      return
    }
    onDone(announcement ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.')
  }

  return (
    <ModalWrap onClose={onClose} width={480}>
      <ModalTitle>{announcement ? '공지사항 수정' : '공지사항 등록'}</ModalTitle>
      <InlineError>{localError}</InlineError>
      <form onSubmit={handleSubmit}>
        <Field label="내용">
          <textarea style={textareaStyle} value={content} onChange={(e) => setContent(e.target.value)} placeholder="강사들에게 전달할 공지 내용을 입력하세요." required />
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <GhostButton type="button" onClick={onClose} style={{ flex: 1 }}>
            취소
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? '저장 중...' : announcement ? '저장' : '등록'}
          </PrimaryButton>
        </div>
        {announcement && (
          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 14 }}>
            <DangerButton type="button" onClick={onDelete}>
              이 공지사항 삭제
            </DangerButton>
          </div>
        )}
      </form>
    </ModalWrap>
  )
}
