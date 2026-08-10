// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Events from './pages/Events'
import Settings from './pages/Settings'
import Participants from './pages/Participants'
import ParticipantProfile from './pages/ParticipantProfile'
import Clubs from './pages/Clubs'
import ClubDetail from './pages/ClubDetail'
import Achievements from './pages/Achievements'
import DashboardAnalytics from './pages/DashboardAnalytics'
import TestAchievements from './pages/TestAchievements'
import ProtectedRoute from './components/ProtectedRoute'
import Footer from './components/Footer'

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>
          <Routes>
            {/* Публичные страницы */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/test" element={<TestAchievements />} />
            
            {/* Защищённые страницы */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute><Events /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><Settings /></ProtectedRoute>
            } />
            <Route path="/participants" element={
              <ProtectedRoute><Participants /></ProtectedRoute>
            } />
            <Route path="/participant/:id" element={
              <ProtectedRoute><ParticipantProfile /></ProtectedRoute>
            } />
            <Route path="/clubs" element={
              <ProtectedRoute><Clubs /></ProtectedRoute>
            } />
            <Route path="/club/:id" element={
              <ProtectedRoute><ClubDetail /></ProtectedRoute>
            } />
            <Route path="/achievements" element={
              <ProtectedRoute><Achievements /></ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute><DashboardAnalytics /></ProtectedRoute>
            } />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App