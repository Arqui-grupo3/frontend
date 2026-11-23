import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { dataService } from '../services/dataService'

const formatNumber = (val) => {
  const num = Number(val)
  return isNaN(num) ? '0' : new Intl.NumberFormat('es-CL').format(num)
}

function formatTime(isoStr) {
  if (!isoStr) return '--:--:--'
  try {
    const d = new Date(isoStr)
    return isNaN(d.getTime()) ? isoStr : d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return isoStr
  }
}

export function CycleHistory() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [cycles, setCycles] = useState([])
  const [selectedCycleId, setSelectedCycleId] = useState('')
  const [detailedOperations, setDetailedOperations] = useState(null)
  const [cycleDetail, setCycleDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
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

  // Cargar detalle completo del ciclo seleccionado
  useEffect(() => {
    if (!selectedCycleId) return
    let isMounted = true

    async function loadDetail() {
      setLoadingDetail(true)
      try {
        let token = null
        if (isAuthenticated && getAccessToken) {
          token = await getAccessToken({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.fasantamaria.me',
            },
          }).catch(() => null)
        }
        const [ops, detail] = await Promise.all([
          dataService.getCycleOperations(selectedCycleId, token).catch(() => []),
          dataService.getCycleDetail(selectedCycleId, token).catch(() => null),
        ])
        if (isMounted) {
          setDetailedOperations(ops)
          setCycleDetail(detail)
        }
      } catch {
        if (isMounted) {
          setDetailedOperations(null)
          setCycleDetail(null)
        }
      } finally {
        if (isMounted) setLoadingDetail(false)
      }
    }

    loadDetail()
  }, [selectedCycleId, isAuthenticated, getAccessToken])

  const currentCycle = cycles.find((c) => c.id === selectedCycleId) || cycles[0] || null
  const operations = detailedOperations || currentCycle?.operations || []

  // Extracción de datos específicos de E2
  const statusStmt = cycleDetail?.statusStatements?.[0]?.energy || cycleDetail?.statusStatements?.[0] || null
  const capacity = statusStmt ? (statusStmt.generationCapacity ?? currentCycle?.generationCapacity) : currentCycle?.generationCapacity
  const consumption = statusStmt ? (statusStmt.consumption ?? currentCycle?.consumption) : currentCycle?.consumption
  const baseCost = statusStmt ? (statusStmt.generationCost ?? currentCycle?.generationCost) : currentCycle?.generationCost
  const lastOp = cycleDetail?.lastOperation || null
  const sellerOffers = cycleDetail?.sellerOffers || []
  const sellerBids = cycleDetail?.sellerBids || []
  const walletOps = cycleDetail?.walletOperations || []
  const transportCharged = cycleDetail?.transportChargedCredits ?? 0

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Auditoría y Despacho · RF01</p>
          <h1>Historial de Ciclos</h1>
          <p>
            Registro de balances, órdenes de la central, swaps y auditoría de operaciones aplicadas en cada ciclo.
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
          <p>Consultando ciclos en el backend...</p>
        </div>
      ) : cycles.length === 0 ? (
        <div className="table-card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <h3>Sin ciclos registrados</h3>
          <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
            No hay ciclos con transacciones registradas actualmente en la base de datos.
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="status-success">{currentCycle.status}</span>
              </div>
            </div>

            {/* Banner RF01: Identificación destacada de la última operación aplicada */}
            <div style={{
              background: '#0B3540',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '14px 18px',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(11, 53, 64, 0.15)',
              borderLeft: '4px solid #39D1C8',
            }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
                  Última Operación Aplicada en el Ciclo (RF01)
                </span>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '3px', color: '#39D1C8' }}>
                  {lastOp?.type || currentCycle.lastOperationType || 'Sin eventos'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', opacity: 0.85 }}>Registrada a las:</span>
                <div style={{ fontSize: '13px', fontWeight: '500', fontFamily: 'monospace' }}>
                  {formatTime(lastOp?.receivedAt || currentCycle.lastOperationAt)}
                </div>
              </div>
            </div>

            {/* Balances del ciclo */}
            <div className="balances">
              <div className="balance-card">
                <span>Presupuesto Final (Ledger)</span>
                <strong>{formatNumber(currentCycle.budgetBalance)} <small>créditos</small></strong>
              </div>
              <div className="balance-card balance-energy">
                <span>Balance de Energía Final</span>
                <strong>{formatNumber(currentCycle.energyBalance)} <small>kWh</small></strong>
              </div>
              <div className="balance-card" style={{ borderLeft: '4px solid #F59E0B' }}>
                <span>Transporte Cobrado (Peaje)</span>
                <strong>{formatNumber(transportCharged)} <small>créditos</small></strong>
              </div>
            </div>

            {/* Datos de la central: status-statement y financiamiento */}
            <dl className="facts">
              <div>
                <dt>Capacidad de generación propia</dt>
                <dd>{formatNumber(capacity)} kWh</dd>
              </div>
              <div>
                <dt>Consumo proyectado de la ciudad</dt>
                <dd>{formatNumber(consumption)} kWh</dd>
              </div>
              <div>
                <dt>Costo base de producción propia</dt>
                <dd>${baseCost} créditos / kWh</dd>
              </div>
              <div>
                <dt>Fondos iniciales recibidos</dt>
                <dd>{formatNumber(currentCycle.funds)} créditos</dd>
              </div>
            </dl>

            {/* Sección E2: Ofertas de venta propias */}
            {sellerOffers.length > 0 && (
              <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Oferta Propia en el Mercado (Vendedor)
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#EEF5F6', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Offer ID</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Cantidad Total</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Precio Unitario</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerOffers.map((o) => (
                        <tr key={o.offerId} style={{ borderBottom: '1px solid #EEF5F6' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px' }}>{o.offerId}</td>
                          <td style={{ padding: '8px 12px' }}>{formatNumber(o.totalQuantity)} kWh</td>
                          <td style={{ padding: '8px 12px' }}>${formatNumber(o.pricePerEnergy)} cr/kWh</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                              background: o.status === 'active' ? '#DEF7EC' : '#F3F4F6',
                              color: o.status === 'active' ? '#03543F' : '#374151',
                            }}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sección E2: Bids recibidos de otras ciudades */}
            {sellerBids.length > 0 && (
              <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Bids Recibidos de Compradores
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#EEF5F6', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Comprador</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Cantidad</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Precio</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Estado</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Swap ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerBids.map((b) => (
                        <tr key={b.idpk} style={{ borderBottom: '1px solid #EEF5F6' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{b.buyerCity}</td>
                          <td style={{ padding: '8px 12px' }}>{formatNumber(b.quantity)} kWh</td>
                          <td style={{ padding: '8px 12px' }}>${formatNumber(b.pricePerEnergy)} cr</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                              background: b.status === 'settled' ? '#DEF7EC' : b.status === 'rejected' ? '#FDE8E8' : '#FEF08A',
                              color: b.status === 'settled' ? '#03543F' : b.status === 'rejected' ? '#9B1C1C' : '#713F12',
                            }}>
                              {b.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px' }}>
                            {b.swapId || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sección E2: Swaps de la Wallet */}
            {walletOps.length > 0 && (
              <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Swaps de la Wallet (Estado Final)
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#EEF5F6', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Swap / Op ID</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Operación</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Intentos</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE5E7' }}>Estado Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletOps.map((w) => (
                        <tr key={w.idpk} style={{ borderBottom: '1px solid #EEF5F6' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px' }}>{w.swapId || w.idpk}</td>
                          <td style={{ padding: '8px 12px' }}>{w.operation}</td>
                          <td style={{ padding: '8px 12px' }}>{w.attempts}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                              background: w.status === 'resolved' || w.status === 'accepted' ? '#DEF7EC' : '#FEF08A',
                              color: w.status === 'resolved' || w.status === 'accepted' ? '#03543F' : '#713F12',
                            }}>
                              {w.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Timeline de todas las operaciones */}
            <h3 style={{ marginTop: '1.5rem' }}>
              Operaciones Aplicadas
              {loadingDetail && <small style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.7 }}>· Actualizando...</small>}
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
