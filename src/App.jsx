import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { Login } from './components/Login'
import { Navbar } from './components/Navbar'
import './App.css'

function DashboardScaffold() {
  const { user } = useAuth()

  return (
    <div className="scaffold-card">
      <span className="scaffold-tag">Fase 1 · Scaffold SPA</span>
      <h1>Sesión Iniciada</h1>
      <p className="scaffold-desc">
        La autenticación y el scaffold base de la aplicación se encuentran operativos.
      </p>

      <div className="session-details">
        <div>
          <span className="label">Operador</span>
          <strong>{user?.name}</strong>
        </div>
        <div>
          <span className="label">Correo</span>
          <strong>{user?.email}</strong>
        </div>
        <div>
          <span className="label">Ciudad asignada</span>
          <strong>{user?.cityName} ({user?.cityId})</strong>
        </div>
        <div>
          <span className="label">Estado de sesión</span>
          <span className="pill-active">Autenticado (Local Storage)</span>
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth()

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
      <Navbar />
      <main className="main-content">
        <DashboardScaffold />
      </main>
      <footer className="app-footer">
        <div>
          <span>EnergyShark E1 · IIC2173</span>
          <span>Ciudad REE (Re-Estize) · Fase 1: Scaffold con Login</span>
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
