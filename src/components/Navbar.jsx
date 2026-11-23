import { useAuth } from '../context/useAuth'

export function Navbar({ activeTab, onSelectTab }) {
  const { user, logout } = useAuth()

  const tabs = [
    { id: 'cycles', label: 'Historial de Ciclos (RF01)' },
    { id: 'live-market', label: 'Mercado en Vivo (RF02)' },
    { id: 'admin', label: 'Administración (RF04)' },
    { id: 'span', label: 'Experimento de Span (RF06)' },
    { id: 'audit', label: 'Auditoría (RF05)' },
  ]

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

      <nav className="header-nav" aria-label="Navegación principal">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </header>
  )
}
