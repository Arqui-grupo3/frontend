import { useAuth } from '../context/useAuth'

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand-group">
          <span className="brand-logo">⚡ EnergyShark</span>
          <span className="brand-badge">Nodo {user?.cityId || 'REE'} · {user?.cityName || 'Re-Estize'}</span>
        </div>

        <div className="user-group">
          <div className="user-info">
            <span className="user-name">{user?.name || 'Operador'}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="btn-logout" onClick={logout} title="Cerrar sesión">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  )
}
