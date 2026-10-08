import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { dataService } from '../services/dataService'

const formatMeters = new Intl.NumberFormat('es-CL').format

export function ConnectivityView() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [connectivity, setConnectivity] = useState({
    id: null,
    cycleId: null,
    receivedAt: null,
    distances: [],
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [onlyEnabled, setOnlyEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        let token = null
        if (isAuthenticated && getAccessToken) {
          try {
            token = await getAccessToken({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.fasantamaria.me',
              },
            })
          } catch (authErr) {
            console.error('[ConnectivityView] Error obteniendo access token:', authErr)
            throw new Error(`Error de autenticación con Auth0: ${authErr.message || authErr}`)
          }
        }
        const data = await dataService.getConnectivity(token)
        if (isMounted) {
          setConnectivity(data)
        }
      } catch (err) {
        console.error('[ConnectivityView] Error:', err)
        if (isMounted) {
          setError(err.message || 'Error al conectar con la API de conectividad')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, getAccessToken, refreshIndex])


  const distances = connectivity?.distances || []
  const totalRoutes = distances.length
  const enabledCount = distances.filter((item) => item.enabled).length

  const filteredDistances = distances.filter((item) => {
    const matchesSearch =
      (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesFilter = !onlyEnabled || item.enabled
    return matchesSearch && matchesFilter
  })

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Red de Transmisión</p>
          <h1>Conectividad de Ciudades</h1>
          <p>
            Tabla de distancias y costos de transporte interurbano (<code>distance-table</code>).
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge">
            {loading ? 'Consultando API...' : `${enabledCount} activas / ${totalRoutes} rutas`}
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setRefreshIndex((k) => k + 1)}
            disabled={loading}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
          <strong>Error de conexión con la API:</strong> {error}
        </div>
      )}

      <div className="info-box">
        <div>
          <strong>Topología de Red:</strong> Matriz de distancias vigentes y costos calculados dinámicamente según pérdidas de línea en créditos / (kWh × km).
        </div>
        {connectivity.receivedAt && (
          <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>
            <strong>Última actualización:</strong> {new Date(connectivity.receivedAt).toLocaleString('es-CL')}
            {connectivity.cycleId && <> · <strong>Ciclo:</strong> <code>{connectivity.cycleId}</code></>}
            {connectivity.id && <> · <strong>ID Evento:</strong> <code style={{ fontSize: '11px' }}>{connectivity.id}</code></>}
          </div>
        )}
      </div>

      {/* Controles de filtro y búsqueda */}
      <div className="connectivity-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar ciudad o sigla (ej. Hogwarts, COR)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={totalRoutes === 0}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={onlyEnabled}
            onChange={(e) => setOnlyEnabled(e.target.checked)}
            disabled={totalRoutes === 0}
          />
          <span>Mostrar solo rutas habilitadas ({enabledCount})</span>
        </label>
      </div>

      {/* Tabla de distancias */}
      <div className="table-card">
        {loading && totalRoutes === 0 ? (
          <div className="loading-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <p>Consultando conectividad en el backend (https://api.fasantamaria.me/connectivity)...</p>
          </div>
        ) : totalRoutes === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <h3>Sin tabla de distancias registrada</h3>
            <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
              La API respondió correctamente, pero actualmente la base de datos no contiene ningún evento del tipo <code>distance-table</code> emitido por la central.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Sigla</th>
                <th>Ciudad Destino</th>
                <th>Distancia (km)</th>
                <th>Distancia exacta (m)</th>
                <th>Costo de Transporte</th>
                <th>Estado de Ruta</th>
              </tr>
            </thead>
            <tbody>
              {filteredDistances.length > 0 ? (
                filteredDistances.map((city) => (
                  <tr key={city.code}>
                    <td><strong>{city.code}</strong></td>
                    <td>{city.name}</td>
                    <td>{formatMeters(Math.round(city.distance / 1000))} km</td>
                    <td><code>{formatMeters(city.distance)} m</code></td>
                    <td>{city.transportCost} créditos / (kWh·km)</td>
                    <td>
                      <span className={`status-pill ${city.enabled ? 'pill-active' : 'pill-disabled'}`}>
                        {city.enabled ? 'Habilitada' : 'Deshabilitada'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-message">
                    No se encontraron rutas con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

