import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import AdminLogin from './pages/AdminLogin'
import ChangePassword from './pages/ChangePassword'
import AdminStaffList from './pages/AdminStaffList'
import AdminClassList from './pages/AdminClassList'
import AdminStudentList from './pages/AdminStudentList'
import AdminParentList from './pages/AdminParentList'
import AdminScheduleList from './pages/AdminScheduleList'
import AdminStaffAnnouncements from './pages/AdminStaffAnnouncements'
import AdminStudentAnnouncements from './pages/AdminStudentAnnouncements'
import AdminMockExams from './pages/AdminMockExams'
import AdminSchoolExams from './pages/AdminSchoolExams'
import AdminReadingPassages from './pages/AdminReadingPassages'
import AdminShell from './pages/AdminShell'

const PAGES = {
  staff: AdminStaffList,
  classes: AdminClassList,
  students: AdminStudentList,
  parents: AdminParentList,
  schedule: AdminScheduleList,
  'staff-notices': AdminStaffAnnouncements,
  'student-notices': AdminStudentAnnouncements,
  'mock-exam': AdminMockExams,
  'school-exam': AdminSchoolExams,
  reading: AdminReadingPassages,
}

export default function AdminApp() {
  const [admin, setAdmin] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [changingPassword, setChangingPassword] = useState(false)
  const [page, setPage] = useState('staff')

  useEffect(() => {
    let cancelled = false
    async function restoreSession() {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) {
        if (!cancelled) setCheckingSession(false)
        return
      }
      const { data: teacher, error: teacherErr } = await supabase
        .from('teachers')
        .select('id, name, role, must_change_password')
        .eq('auth_user_id', userId)
        .single()
      if (cancelled) return
      if (!teacherErr && teacher?.role === 'admin') {
        setAdmin(teacher)
      } else {
        await supabase.auth.signOut()
      }
      setCheckingSession(false)
    }
    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  if (checkingSession) {
    return null
  }

  if (!admin) {
    return <AdminLogin onLoggedIn={setAdmin} />
  }

  if (admin.must_change_password) {
    return <ChangePassword onChanged={() => setAdmin({ ...admin, must_change_password: false })} />
  }

  if (changingPassword) {
    return (
      <ChangePassword
        forced={false}
        onChanged={() => setChangingPassword(false)}
        onCancel={() => setChangingPassword(false)}
      />
    )
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setAdmin(null)
  }

  const Page = PAGES[page] ?? AdminStaffList

  return (
    <AdminShell
      active={page}
      admin={admin}
      onLoggedOut={handleLogout}
      onChangePassword={() => setChangingPassword(true)}
      onNavigate={setPage}
    >
      <Page />
    </AdminShell>
  )
}
