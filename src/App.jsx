import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { Login } from './components/Login'
import { Navbar } from './components/Navbar'
import { CycleHistory } from './components/CycleHistory'
import { MarketLiveView } from './components/MarketLiveView'
import { MarketAdminView } from './components/MarketAdminView'
import { SpanExperimentView } from './components/SpanExperimentView'
import { AuditLogView } from './components/AuditLogView'
import './App.css'

function AppContent() {
  const { isAuthenticated, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('cycles')

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Cargando sesión de EnergyShark...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div className="app-shell">
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />
      <main className="main-content">
        {activeTab === 'cycles' && <CycleHistory />}
        {activeTab === 'live-market' && <MarketLiveView />}
        {activeTab === 'admin' && <MarketAdminView />}
        {activeTab === 'experiment' && <SpanExperimentView />}
        {activeTab === 'audit' && <AuditLogView />}
        {activeTab === 'span' && <SpanExperimentView />}
      </main>
      <footer className="app-footer">
        <div>
          <span>EnergyShark · Ciudad REE (Re-Estize)</span>
          <span>Plataforma de Despacho y Negociación Energética</span>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
