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
  Badge,
  Field,
  Input,
  Select,
  ModalWrap,
  ModalTitle,
  InlineError,
} from '../lib/adminUI'
import { todayStr } from '../lib/statusColors'

const AUDIENCE_TYPES = ['전체', '반', '개별']

function statusOf(a) {
  if (!a.is_active) return { label: '비활성', positive: false }
  const today = todayStr()
  if (a.starts_at && today < a.starts_at) return { label: '게시 예정', positive: false }
  if (a.ends_at && today > a.ends_at) return { label: '기간 종료', positive: false }
  return { label: '게시중', positive: true }
}

export default function AdminStudentAnnouncements() {
  const showToast = useToast()
  const [announcements, setAnnouncements] = useState(null)
  const [classes, setClasses] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

  async function reload() {
    const { data, error: fetchErr } = await supabase
      .from('student_announcements')
      .select('id, title, content, audience_type, class_id, classes(name), starts_at, ends_at, is_active, notify_student, notify_parent, last_pushed_at, created_at')
      .order('created_at', { ascending: false })
    if (fetchErr) {
      setError('공지사항을 불러오지 못했습니다: ' + fetchErr.message)
      return
    }
    setAnnouncements(data)
  }

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('id, name').eq('status', '운영중').order('name')
    setClasses(data ?? [])
  }

  useEffect(() => {
    reload()
    loadClasses()
  }, [])

  async function toggleActive(a) {
    const { error: dbErr } = await supabase.from('student_announcements').update({ is_active: !a.is_active }).eq('id', a.id)
    if (dbErr) {
      showToast('상태 변경 실패: ' + dbErr.message, 'error')
      return
    }
    showToast(a.is_active ? '공지사항을 비활성화했습니다.' : '공지사항을 다시 활성화했습니다.')
    reload()
  }

  async function handleDelete(a) {
    if (!confirm('이 공지사항을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return
    const { error: dbErr } = await supabase.from('student_announcements').delete().eq('id', a.id)
    if (dbErr) {
      showToast('삭제 실패: ' + dbErr.message, 'error')
      return
    }
    showToast('공지사항이 삭제되었습니다.')
    reload()
  }

  async function handleSendPush(a) {
    const confirmMsg = a.last_pushed_at
      ? '이미 한 번 발송한 공지사항이에요. 알림을 다시 보낼까요?'
      : '학생/학부모 알림을 구독한 사람들에게 푸시 알림을 보낼까요?'
    if (!confirm(confirmMsg)) return
    const { data: result, error: fnErr } = await supabase.functions.invoke('send-announcement-push', { body: { announcementId: a.id } })
    if (fnErr) {
      showToast('알림 발송 실패: ' + fnErr.message, 'error')
      return
    }
    showToast(`알림을 ${result.sent}건 발송했습니다. (구독자 ${result.total}명 중)`)
    reload()
  }

  return (
    <div>
      <PageHeader
        title="학생/학부모 공지"
        subtitle="학생과 학부모에게 노출할 공지입니다. (직원 대상 공지와는 완전히 별개입니다)"
        action={<PrimaryButton onClick={() => setCreating(true)}>+ 공지 등록</PrimaryButton>}
      />

      <PageError>{error}</PageError>
      {!announcements && !error && <PageLoading />}

      {announcements && announcements.length === 0 && <EmptyState>등록된 공지사항이 없습니다.</EmptyState>}

      {announcements && announcements.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {announcements.map((a) => {
            const status = statusOf(a)
            const audienceLabel = a.audience_type === '반' ? `반 · ${a.classes?.name ?? '삭제됨'}` : a.audience_type === '개별' ? '개별 학생' : '전체'
            const recipientLabel = a.notify_student && a.notify_parent ? '학생+학부모' : a.notify_student ? '학생만' : a.notify_parent ? '학부모만' : '받는 사람 없음'
            return (
              <div key={a.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 18px', opacity: a.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <Badge bg={status.positive ? T.success.bg : T.danger.bg} color={status.positive ? T.success.text : T.danger.text}>
                        {status.label}
                      </Badge>
                      <Badge bg={T.primaryTint} color={T.primaryDark}>
                        {audienceLabel}
                      </Badge>
                      <Badge bg={T.border} color={T.inkMuted}>
                        {recipientLabel}
                      </Badge>
                      {(a.starts_at || a.ends_at) && (
                        <span style={{ fontSize: 11.5, color: T.inkFaint }}>
                          {a.starts_at ?? '제한없음'} ~ {a.ends_at ?? '제한없음'}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 700, color: T.ink }}>{a.title}</p>
                    <p style={{ margin: '0 0 6px', fontSize: 13, color: T.inkMuted, whiteSpace: 'pre-wrap' }}>{a.content}</p>
                    <p style={{ margin: 0, fontSize: 11, color: T.inkFaint }}>
                      {a.last_pushed_at ? `📨 알림 발송됨 · ${new Date(a.last_pushed_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : '알림 발송 안 함'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <SmallButton onClick={() => handleSendPush(a)}>{a.last_pushed_at ? '알림 다시 발송' : '알림 발송'}</SmallButton>
                    <SmallButton onClick={() => setEditing(a)}>수정</SmallButton>
                    <SmallButton onClick={() => toggleActive(a)}>{a.is_active ? '비활성화' : '활성화'}</SmallButton>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {creating && (
        <AnnouncementModal
          classes={classes}
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
          classes={classes}
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
  minHeight: 100,
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

function StudentPicker({ selected, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('students')
        .select('id, name, classes(name)')
        .eq('status', '재원')
        .ilike('name', `%${query.trim()}%`)
        .order('name')
        .limit(20)
      if (!cancelled) setResults(data ?? [])
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  function toggle(student) {
    const exists = selected.some((s) => s.id === student.id)
    onChange(exists ? selected.filter((s) => s.id !== student.id) : [...selected, student])
  }

  return (
    <div>
      <Input type="text" placeholder="학생 이름 검색" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 8 }} />
      {results && results.length > 0 && (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 8, maxHeight: 140, overflowY: 'auto' }}>
          {results.map((s) => (
            <label key={s.id} className="admin-list-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 13, cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}>
              <input type="checkbox" checked={selected.some((sel) => sel.id === s.id)} onChange={() => toggle(s)} />
              {s.name}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: T.inkFaint }}>{s.classes?.name ?? '미배정'}</span>
            </label>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {selected.map((s) => (
            <span
              key={s.id}
              style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 999, background: T.primaryTint, color: T.primaryDark, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {s.name}
              <button
                type="button"
                onClick={() => toggle(s)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.primaryDark, fontWeight: 700, padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function AnnouncementModal({ announcement, classes, onClose, onDone, onDelete }) {
  const [title, setTitle] = useState(announcement?.title ?? '')
  const [content, setContent] = useState(announcement?.content ?? '')
  const [audienceType, setAudienceType] = useState(announcement?.audience_type ?? '전체')
  const [classId, setClassId] = useState(announcement?.class_id ?? '')
  const [startsAt, setStartsAt] = useState(announcement?.starts_at ?? '')
  const [endsAt, setEndsAt] = useState(announcement?.ends_at ?? '')
  const [notifyStudent, setNotifyStudent] = useState(announcement?.notify_student ?? true)
  const [notifyParent, setNotifyParent] = useState(announcement?.notify_parent ?? true)
  const [selectedStudents, setSelectedStudents] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!announcement || announcement.audience_type !== '개별') return
    supabase
      .from('student_announcement_targets')
      .select('student_id, students(id, name)')
      .eq('announcement_id', announcement.id)
      .then(({ data }) => {
        setSelectedStudents((data ?? []).map((row) => row.students).filter(Boolean))
      })
  }, [announcement])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    if (audienceType === '반' && !classId) {
      setLocalError('대상 반을 선택해주세요.')
      return
    }
    if (audienceType === '개별' && selectedStudents.length === 0) {
      setLocalError('대상 학생을 한 명 이상 선택해주세요.')
      return
    }
    if (!notifyStudent && !notifyParent) {
      setLocalError('받는 사람을 학생/학부모 중 한 명 이상 선택해주세요.')
      return
    }
    setLocalError('')
    setSubmitting(true)

    const payload = {
      title: title.trim(),
      content: content.trim(),
      audience_type: audienceType,
      class_id: audienceType === '반' ? classId : null,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      notify_student: notifyStudent,
      notify_parent: notifyParent,
    }

    let announcementId = announcement?.id
    if (announcement) {
      const { error: dbErr } = await supabase.from('student_announcements').update(payload).eq('id', announcement.id)
      if (dbErr) {
        setSubmitting(false)
        setLocalError('저장 실패: ' + dbErr.message)
        return
      }
      await supabase.from('student_announcement_targets').delete().eq('announcement_id', announcement.id)
    } else {
      const { data, error: dbErr } = await supabase.from('student_announcements').insert({ ...payload, is_active: true }).select('id').single()
      if (dbErr) {
        setSubmitting(false)
        setLocalError('등록 실패: ' + dbErr.message)
        return
      }
      announcementId = data.id
    }

    if (audienceType === '개별' && selectedStudents.length > 0) {
      const rows = selectedStudents.map((s) => ({ announcement_id: announcementId, student_id: s.id }))
      const { error: targetErr } = await supabase.from('student_announcement_targets').insert(rows)
      if (targetErr) {
        setSubmitting(false)
        setLocalError('대상 학생 저장 실패: ' + targetErr.message)
        return
      }
    }

    setSubmitting(false)
    onDone(announcement ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다. 목록에서 "알림 발송" 버튼으로 원하는 때에 알림을 보낼 수 있어요.')
  }

  return (
    <ModalWrap onClose={onClose} width={520}>
      <ModalTitle>{announcement ? '공지사항 수정' : '공지사항 등록'}</ModalTitle>
      <InlineError>{localError}</InlineError>
      <form onSubmit={handleSubmit}>
        <Field label="제목">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="내용">
          <textarea style={textareaStyle} value={content} onChange={(e) => setContent(e.target.value)} required />
        </Field>
        <Field label="대상">
          <Select value={audienceType} onChange={(e) => setAudienceType(e.target.value)}>
            {AUDIENCE_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        {audienceType === '반' && (
          <Field label="대상 반">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">반 선택...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {audienceType === '개별' && (
          <Field label="대상 학생">
            <StudentPicker selected={selectedStudents} onChange={setSelectedStudents} />
          </Field>
        )}
        <Field label="받는 사람">
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: T.ink, cursor: 'pointer' }}>
              <input type="checkbox" checked={notifyStudent} onChange={(e) => setNotifyStudent(e.target.checked)} />
              학생
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: T.ink, cursor: 'pointer' }}>
              <input type="checkbox" checked={notifyParent} onChange={(e) => setNotifyParent(e.target.checked)} />
              학부모
            </label>
          </div>
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field label="노출 시작일 (선택)">
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="노출 종료일 (선택)">
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </Field>
          </div>
        </div>

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
