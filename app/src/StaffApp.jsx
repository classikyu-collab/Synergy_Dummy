import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import StaffLogin from './pages/StaffLogin'
import ChangePassword from './pages/ChangePassword'
import StaffHome from './pages/StaffHome'
import ClassList from './pages/ClassList'
import ClassDetail from './pages/ClassDetail'
import SchoolExamReview from './pages/SchoolExamReview'
import ReadingReview from './pages/ReadingReview'
import MockExamReview from './pages/MockExamReview'
import HomeworkRegister from './pages/HomeworkRegister'
import StaffShell from './pages/StaffShell'

function VoluntaryChangePassword() {
  const navigate = useNavigate()
  return <ChangePassword forced={false} onChanged={() => navigate('/staff')} onCancel={() => navigate('/staff')} />
}

export default function StaffApp() {
  const [teacher, setTeacher] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function restoreSession() {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) {
        if (!cancelled) setCheckingSession(false)
        return
      }
      const { data: teacherRow, error: teacherErr } = await supabase
        .from('teachers')
        .select('id, name, role, must_change_password')
        .eq('auth_user_id', userId)
        .single()
      if (cancelled) return
      if (!teacherErr && teacherRow) {
        setTeacher(teacherRow)
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

  if (!teacher) {
    return <StaffLogin onLoggedIn={setTeacher} />
  }

  if (teacher.must_change_password) {
    return <ChangePassword onChanged={() => setTeacher({ ...teacher, must_change_password: false })} />
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setTeacher(null)
  }

  return (
    <Routes>
      <Route path="change-password" element={<VoluntaryChangePassword />} />
      <Route
        path="*"
        element={
          <StaffShell teacher={teacher} onLoggedOut={handleLogout}>
            <Routes>
              <Route path="/" element={<StaffHome teacher={teacher} />} />
              <Route path="classes" element={<ClassList teacher={teacher} />} />
              <Route path="classes/:classId" element={<ClassDetail teacher={teacher} />} />
              <Route path="classes/:classId/homework" element={<HomeworkRegister teacher={teacher} />} />
              <Route path="mock-exam-review" element={<MockExamReview />} />
              <Route path="school-exam-review" element={<SchoolExamReview />} />
              <Route path="reading-review" element={<ReadingReview teacher={teacher} />} />
            </Routes>
          </StaffShell>
        }
      />
    </Routes>
  )
}
