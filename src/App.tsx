import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FormPage from './pages/FormPage'
import CrmPage from './pages/CrmPage'
import AdminPage from './pages/AdminPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/form/:slug"      element={<FormPage />} />
        <Route path="/crm/:slug"       element={<CrmPage />} />
        <Route path="/dashboard/:slug" element={<DashboardPage />} />
        <Route path="/admin"           element={<AdminPage />} />
        <Route path="*"                element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
