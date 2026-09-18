import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import StaffApp from './StaffApp'
import AdminApp from './AdminApp'
import ParentView from './pages/ParentView'
import ParentDetail from './pages/ParentDetail'
import ParentHomework from './pages/ParentHomework'
import ParentCoachingList from './pages/ParentCoachingList'
import ParentAnnouncements from './pages/ParentAnnouncements'
import StudentClassSelect from './pages/StudentClassSelect'
import StudentNameSelect from './pages/StudentNameSelect'
import StudentHome from './pages/StudentHome'
import StudentCoachingList from './pages/StudentCoachingList'
import StudentHomework from './pages/StudentHomework'
import StudentMockExamList from './pages/StudentMockExamList'
import StudentMockExamSheet from './pages/StudentMockExamSheet'
import StudentMockExamResult from './pages/StudentMockExamResult'
import StudentAnnouncements from './pages/StudentAnnouncements'
import StudentSchoolExamList from './pages/StudentSchoolExamList'
import StudentSchoolExamSheet from './pages/StudentSchoolExamSheet'
import StudentSchoolExamResult from './pages/StudentSchoolExamResult'
import StudentReadingList from './pages/StudentReadingList'
import StudentReadingRecord from './pages/StudentReadingRecord'

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
        <Route path="/student" element={<StudentClassSelect />} />
        <Route path="/student/:classId" element={<StudentNameSelect />} />
        <Route path="/student/:classId/:studentId" element={<StudentHome />} />
        <Route path="/student/:classId/:studentId/coaching" element={<StudentCoachingList />} />
        <Route path="/student/:classId/:studentId/homework" element={<StudentHomework />} />
        <Route path="/student/:classId/:studentId/mock-exam" element={<StudentMockExamList />} />
        <Route path="/student/:classId/:studentId/mock-exam/result/:attemptId" element={<StudentMockExamResult />} />
        <Route path="/student/:classId/:studentId/mock-exam/:examId" element={<StudentMockExamSheet />} />
        <Route path="/student/:classId/:studentId/announcements" element={<StudentAnnouncements />} />
        <Route path="/student/:classId/:studentId/school-exam" element={<StudentSchoolExamList />} />
        <Route path="/student/:classId/:studentId/school-exam/result/:attemptId" element={<StudentSchoolExamResult />} />
        <Route path="/student/:classId/:studentId/school-exam/:worksheetId" element={<StudentSchoolExamSheet />} />
        <Route path="/student/:classId/:studentId/reading" element={<StudentReadingList />} />
        <Route path="/student/:classId/:studentId/reading/:passageId" element={<StudentReadingRecord />} />
        <Route path="/parent" element={<ParentView />} />
        <Route path="/parent/:studentId" element={<ParentDetail />} />
        <Route path="/parent/:studentId/homework" element={<ParentHomework />} />
        <Route path="/parent/:studentId/coaching" element={<ParentCoachingList />} />
        <Route path="/parent/:studentId/announcements" element={<ParentAnnouncements />} />
        <Route path="/admin" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/staff" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
