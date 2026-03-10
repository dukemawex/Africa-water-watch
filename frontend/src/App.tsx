import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/shared/Layout'
import Dashboard from './pages/Dashboard'
import MapPage from './pages/WaterPoint'
import Maintenance from './pages/Maintenance'
import Alerts from './pages/Alerts'
import Login from './pages/Login'
import { useWaterStore } from './store/useWaterStore'
import { AIInsightChat } from './components/AI/AIInsightChat'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useWaterStore()
  const token = localStorage.getItem('access_token')
  if (!token && !user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { waterPoints, selectedPointId } = useWaterStore()
  const selectedPoint = waterPoints.find((p) => p.id === selectedPointId) ?? null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                  <Route path="/alerts" element={<Alerts />} />
                </Routes>
                <AIInsightChat waterPoint={selectedPoint} />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
