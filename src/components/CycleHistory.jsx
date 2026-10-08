import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { dataService } from '../services/dataService'

const formatNumber = (val) => {
  const num = Number(val)
  return isNaN(num) ? '0' : new Intl.NumberFormat('es-CL').format(num)
}

export function CycleHistory() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [cycles, setCycles] = useState([])
  const [selectedCycleId, setSelectedCycleId] = useState('')
  const [detailedOperations, setDetailedOperations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingOps, setLoadingOps] = useState(false)
  const [error, setError] = useState(null)

  // Cargar lista de ciclos
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
            console.error('[CycleHistory] Error obteniendo access token:', authErr)
            throw new Error(`Error de autenticación con Auth0: ${authErr.message || authErr}`)
          }
        }
        const data = await dataService.getCycles(token)
        if (isMounted) {
          setCycles(data)
          if (data.length > 0) {
            setSelectedCycleId((prev) => (prev && data.some((c) => c.id === prev) ? prev : data[0].id))
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error al conectar con la API de ciclos')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
  }, [isAuthenticated, getAccessToken])

  // Cargar operaciones detalladas cuando cambia el ciclo seleccionado
  useEffect(() => {
    if (!selectedCycleId) return
    let isMounted = true

    async function loadOps() {
      setLoadingOps(true)
      try {
        let token = null
        if (isAuthenticated && getAccessToken) {
          token = await getAccessToken({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.fasantamaria.me',
            },
          }).catch(() => null)
        }
        const ops = await dataService.getCycleOperations(selectedCycleId, token)
        if (isMounted) {
          setDetailedOperations(ops)
        }
      } catch {
        if (isMounted) setDetailedOperations(null)
      } finally {
        if (isMounted) setLoadingOps(false)
      }
    }

    loadOps()
  }, [selectedCycleId, isAuthenticated, getAccessToken])

  const currentCycle = cycles.find((c) => c.id === selectedCycleId) || cycles[0] || null
  const operations = detailedOperations || currentCycle?.operations || []

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Operaciones Energéticas</p>
          <h1>Historial de Ciclos</h1>
          <p>
            Registro de balances, órdenes de la central y operaciones aplicadas en cada ciclo.
          </p>
        </div>
        <span className="badge">
          {loading ? 'Consultando API...' : `Total Ciclos: ${cycles.length}`}
        </span>
      </div>

      {error && (
        <div className="alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
          <strong>Error de conexión con la API:</strong> {error}
        </div>
      )}

      {loading && cycles.length === 0 ? (
        <div className="loading-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <p>Consultando ciclos en el backend (https://api.fasantamaria.me/cycles)...</p>
        </div>
      ) : cycles.length === 0 ? (
        <div className="table-card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <h3>Sin ciclos registrados</h3>
          <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
            La API respondió correctamente, pero actualmente la base de datos de producción no contiene eventos con <code>cycle_id</code> asociados a E1.
          </p>
        </div>
      ) : !currentCycle ? (
        <div className="empty-message">No se pudo cargar el ciclo seleccionado.</div>
      ) : (
        <div className="layout">
          {/* Barra lateral de selección de ciclos */}
          <aside className="list" aria-labelledby="cycles-list-title">
            <h2 id="cycles-list-title">Ciclos ({cycles.length})</h2>
            <div className="cycles-nav">
              {cycles.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`cycle-card ${selectedCycleId === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedCycleId(c.id)}
                >
                  <strong>{c.id}</strong>
                  <small>{c.date} · {c.period}</small>
                  <small className="cycle-card-status">{c.status}</small>
                </button>
              ))}
            </div>
          </aside>

          {/* Panel de detalle del ciclo seleccionado */}
          <section className="detail" aria-labelledby="cycle-detail-title">
            <div className="detail-title">
              <div>
                <p className="eyebrow">Detalle del ciclo</p>
                <h2 id="cycle-detail-title">{currentCycle.id} ({currentCycle.period})</h2>
              </div>
              <span className="status-success">{currentCycle.status}</span>
            </div>

            {/* Balances finales */}
            <div className="balances">
              <div className="balance-card">
                <span>Presupuesto Final (Ledger)</span>
                <strong>{formatNumber(currentCycle.budgetBalance)} <small>créditos</small></strong>
              </div>
              <div className="balance-card balance-energy">
                <span>Balance de Energía Final</span>
                <strong>{formatNumber(currentCycle.energyBalance)} <small>kWh</small></strong>
              </div>
            </div>

            {/* Datos del status-statement y transfer */}
            <dl className="facts">
              <div>
                <dt>Capacidad de generación propia (status-statement)</dt>
                <dd>{formatNumber(currentCycle.generationCapacity)} kWh</dd>
              </div>
              <div>
                <dt>Consumo proyectado de la ciudad</dt>
                <dd>{formatNumber(currentCycle.consumption)} kWh</dd>
              </div>
              <div>
                <dt>Costo base de producción propia</dt>
                <dd>${currentCycle.generationCost} créditos / kWh</dd>
              </div>
              <div>
                <dt>Fondos iniciales recibidos (transfer)</dt>
                <dd>{formatNumber(currentCycle.funds)} créditos</dd>
              </div>
            </dl>

            <h3>
              Operaciones Aplicadas
              {loadingOps && <small style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.7 }}>· Actualizando...</small>}
            </h3>

            <ol className="timeline">
              {operations.map((op, index) => {
                const isLast = op.isLast ?? (index === operations.length - 1)
                return (
                  <li key={`${op.time}-${index}`} className={isLast ? 'timeline-item-last' : ''}>
                    <time>{op.time}</time>
                    <div>
                      <div className="timeline-header">
                        <strong>{op.name}</strong>
                        {isLast && (
                          <span className="last" aria-label="Última operación del ciclo">
                            Última operación aplicada
                          </span>
                        )}
                      </div>
                      <p>{op.detail}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>
      )}
    </div>
  )
}
