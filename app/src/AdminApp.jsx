import { useState } from 'react'
import AdminLogin from './pages/AdminLogin'
import ChangePassword from './pages/ChangePassword'
import AdminHome from './pages/AdminHome'

export default function AdminApp() {
  const [admin, setAdmin] = useState(null)
  const [changingPassword, setChangingPassword] = useState(false)

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

  return (
    <AdminHome
      admin={admin}
      onLoggedOut={() => setAdmin(null)}
      onChangePassword={() => setChangingPassword(true)}
    />
  )
}
