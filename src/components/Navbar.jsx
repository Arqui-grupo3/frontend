import { useAuth } from '../context/useAuth'

export function Navbar({ activeTab, onSelectTab }) {
  const { user, logout } = useAuth()

  const tabs = [
    { id: 'cycles', label: 'Historial de Ciclos' },
    { id: 'connectivity', label: 'Red y Conectividad' },
    { id: 'negotiations', label: 'Negociaciones' },
    { id: 'audit', label: 'Registro de Auditoría' },
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
