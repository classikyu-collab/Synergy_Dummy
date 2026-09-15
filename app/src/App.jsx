import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import StaffApp from './StaffApp'

function ComingSoon({ label }) {
  return (
    <div style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>{label}</h2>
      <p>준비 중입니다.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/staff/*" element={<StaffApp />} />
        <Route path="/student" element={<ComingSoon label="학생 로그인" />} />
        <Route path="/parent" element={<ComingSoon label="학부모" />} />
        <Route path="/admin" element={<ComingSoon label="관리자" />} />
        <Route path="*" element={<Navigate to="/staff" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
