import { useState } from 'react'
import StaffLogin from './pages/StaffLogin'
import ChangePassword from './pages/ChangePassword'
import StaffHome from './pages/StaffHome'

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

  return <StaffHome teacher={teacher} onLoggedOut={() => setTeacher(null)} />
}
