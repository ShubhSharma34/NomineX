import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Shortlist from './pages/Shortlist'
import History from './pages/History'
import Nominations from './pages/Nominations'
import ColdStart from './pages/ColdStart'

export default function App() {
  const role = localStorage.getItem('role')

  return (
    <ConfigProvider theme={{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary    : '#3b82f6',
        colorBgContainer: '#13151f',
        colorBgBase     : '#0f1117',
        borderRadius    : 8,
        fontFamily      : 'Inter, system-ui, sans-serif',
      }
    }}>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/shortlist" element={<Shortlist />} />
          <Route path="/history"   element={<History />} />
          <Route path="/nominations/:id" element={<Nominations />} />
          <Route path="/coldstart" element={<ColdStart />} />
          <Route path="*"          element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}