import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import StaffLogin from './pages/StaffLogin'
import ChangePassword from './pages/ChangePassword'
import ClassList from './pages/ClassList'
import ClassDetail from './pages/ClassDetail'

export default function StaffApp() {
  const [teacher, setTeacher] = useState(null)

  if (!teacher) {
    return <StaffLogin onLoggedIn={setTeacher} />
  }

  if (teacher.must_change_password) {
    return (
      <ChangePassword
        onChanged={() => setTeacher({ ...teacher, must_change_password: false })}
      />
    )
  }

  return (
    <Routes>
      <Route path="/" element={<ClassList teacher={teacher} onLoggedOut={() => setTeacher(null)} />} />
      <Route path="classes/:classId" element={<ClassDetail teacher={teacher} />} />
    </Routes>
  )
}
