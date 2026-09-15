import { supabase } from '../lib/supabaseClient'

export default function StaffHome({ teacher, onLoggedOut }) {
  async function handleLogout() {
    await supabase.auth.signOut()
    onLoggedOut()
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>{teacher.name}님 환영합니다</h2>
      <p>역할: {teacher.role}</p>
      <p>담임 화면은 다음 단계에서 이어서 만듭니다.</p>
      <button onClick={handleLogout} style={{ padding: 10 }}>
        로그아웃
      </button>
    </div>
  )
}
