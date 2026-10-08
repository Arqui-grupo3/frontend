import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { dataService } from '../services/dataService'

const formatNumber = (val) => {
  const num = Number(val)
  return isNaN(num) ? '0' : new Intl.NumberFormat('es-CL').format(num)
}

export function NegotiationView() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [proposals, setProposals] = useState([])
  const [cycles, setCycles] = useState([])
  const [formCycleId, setFormCycleId] = useState('')
  const [direction, setDirection] = useState('give')
  const [quantity, setQuantity] = useState(1000)
  const [pricePerEnergy, setPricePerEnergy] = useState(220.5)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Cargar ciclos y propuestas desde el backend
  useEffect(() => {
    let isMounted = true

    async function loadData() {
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
            console.error('[NegotiationView] Error obteniendo access token:', authErr)
            throw new Error(`Error de autenticación con Auth0: ${authErr.message || authErr}`)
          }
        }

        const [cyclesData, negotiationsData] = await Promise.all([
          dataService.getCycles(token).catch(() => []),
          dataService.getNegotiations(null, token),
        ])

        if (isMounted) {
          setCycles(cyclesData)
          setFormCycleId((prev) => prev || cyclesData[0]?.id || '')
          setProposals(negotiationsData)
        }
      } catch (err) {
        console.error('[NegotiationView] Error al cargar negociaciones:', err)
        if (isMounted) {
          setError(err.message || 'Error al conectar con la API de negociaciones')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, getAccessToken, refreshIndex])

  // Auto-refresco cada 10 segundos si hay propuestas en curso (pending o confirmed)
  useEffect(() => {
    const hasActive = proposals.some(
      (p) => p.rawStatus === 'pending' || p.rawStatus === 'confirmed'
    )
    if (!hasActive) return

    const timer = setInterval(() => {
      setRefreshIndex((k) => k + 1)
    }, 10000)

    return () => clearInterval(timer)
  }, [proposals])

  // Cálculo dinámico del tope reglamentario basado en el ciclo activo
  const selectedCycle = cycles.find((c) => c.id === formCycleId) || cycles[0]
  const baseCost = Number(selectedCycle?.generationCost) || 210
  const priceCap = Math.round(1.05 * baseCost * 100) / 100

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedbackMsg(null)

    const numPrice = Number(pricePerEnergy)
    const numQty = Number(quantity)

    if (numPrice > priceCap) {
      setFeedbackMsg({
        type: 'error',
        text: `Error de validación: El precio ofertado ($${numPrice}) excede el tope máximo permitido ($${priceCap} créditos).`,
      })
      setIsSubmitting(false)
      return
    }

    if (!formCycleId || !formCycleId.trim()) {
      setFeedbackMsg({
        type: 'error',
        text: 'Debes especificar un cycleId para emitir la propuesta.',
      })
      setIsSubmitting(false)
      return
    }

    try {
      let token = null
      if (isAuthenticated && getAccessToken) {
        token = await getAccessToken({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.fasantamaria.me',
          },
        })
      }

      const res = await dataService.createProposal(
        {
          cycleId: formCycleId.trim(),
          direction,
          quantity: numQty,
          pricePerEnergy: numPrice,
        },
        token
      )

      setFeedbackMsg({
        type: 'success',
        text: `Propuesta creada exitosamente (ID: ${res.idpk || res.id || 'ok'}). Estado: ${res.status || 'pending'}. La central procesará confirmación en ≤ 30s.`,
      })

      // Refrescar listado de propuestas
      setRefreshIndex((k) => k + 1)
    } catch (err) {
      console.error('[NegotiationView] Error al enviar propuesta:', err)
      setFeedbackMsg({
        type: 'error',
        text: `Error al emitir propuesta: ${err.message || err}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Mercado de Energía</p>
          <h1>Negociaciones Voluntarias</h1>
          <p>
            Ofertas directas de compra y venta de energía hacia la central (<code>negotiation-proposal</code>).
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge">
            {loading ? 'Consultando API...' : `${proposals.length} registradas`}
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

      <div className="two-columns">
        {/* Formulario de emisión de propuesta */}
        <section className="form-card" aria-labelledby="form-title">
          <h2 id="form-title">Nueva Propuesta</h2>
          <p className="section-hint">
            Tope de precio regulado: <strong>${priceCap} créditos</strong> (1.05 × costo base de generación).
          </p>

          {feedbackMsg && (
            <div className={feedbackMsg.type === 'error' ? 'alert-error' : 'alert-success'}>
              {feedbackMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="proposal-form">
            <div className="form-group">
              <label htmlFor="cycleSelect">Ciclo Objetivo</label>
              {cycles.length > 0 ? (
                <select
                  id="cycleSelect"
                  value={formCycleId}
                  onChange={(e) => setFormCycleId(e.target.value)}
                  required
                >
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} {c.status ? `(${c.status})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="cycleSelect"
                  type="text"
                  placeholder="ej. cycle-248808"
                  value={formCycleId}
                  onChange={(e) => setFormCycleId(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="form-group">
              <label>Tipo de Operación</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="direction"
                    value="give"
                    checked={direction === 'give'}
                    onChange={(e) => {
                      setDirection(e.target.value)
                      setPricePerEnergy(priceCap)
                    }}
                  />
                  <span>Vender energía (give) · Margen del 5%</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="direction"
                    value="take"
                    checked={direction === 'take'}
                    onChange={(e) => {
                      setDirection(e.target.value)
                      setPricePerEnergy(baseCost)
                    }}
                  />
                  <span>Comprar energía (take) · Costo base</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Cantidad de Energía (kWh)</label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Precio Ofertado ($ por kWh)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                max={priceCap}
                value={pricePerEnergy}
                onChange={(e) => setPricePerEnergy(e.target.value)}
                required
              />
              <small className="field-note">
                {pricePerEnergy > priceCap ? (
                  <strong className="text-danger">Supera el tope reglamentario (${priceCap})</strong>
                ) : (
                  `Dentro del límite regulatorio (≤ $${priceCap})`
                )}
              </small>
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Transmitiendo propuesta...' : 'Enviar Propuesta'}
            </button>
          </form>
        </section>

        {/* Tabla de historial y seguimiento */}
        <section className="table-card" aria-labelledby="history-title">
          <h2 id="history-title">Historial y Seguimiento de Propuestas</h2>
          {loading && proposals.length === 0 ? (
            <div className="loading-state" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <p>Consultando propuestas en la API...</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ciclo</th>
                  <th>Tipo</th>
                  <th>Energía</th>
                  <th>Precio</th>
                  <th>Estado Final</th>
                  <th>Detalle / Pago</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {proposals.length > 0 ? (
                  proposals.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <code title={p.idpk}>
                          {p.idpk.length > 12 ? `${p.idpk.slice(0, 8)}…` : p.idpk}
                        </code>
                      </td>
                      <td>
                        <code>{p.cycleId}</code>
                      </td>
                      <td>
                        <span className={`direction-badge ${p.direction === 'give' ? 'badge-give' : 'badge-take'}`}>
                          {p.direction.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <strong>{formatNumber(p.quantity)} kWh</strong>
                        {p.energyAgreed && p.energyAgreed !== p.quantity && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            Acordado: {formatNumber(p.energyAgreed)} kWh
                          </div>
                        )}
                      </td>
                      <td>
                        ${p.pricePerEnergy}
                        {p.priceAgreed && p.priceAgreed !== p.pricePerEnergy && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            Acordado: ${p.priceAgreed}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${p.statusBadge}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.paymentAmount ? (
                          <span style={{ fontWeight: 600, color: 'var(--color-abyssal)' }}>
                            ${formatNumber(p.paymentAmount)} créditos
                          </span>
                        ) : p.lastError ? (
                          <span style={{ color: 'var(--color-error-text)', fontSize: '12px' }}>
                            {p.lastError}
                          </span>
                        ) : p.phase ? (
                          <small style={{ color: 'var(--color-text-muted)' }}>Fase: {p.phase}</small>
                        ) : (
                          <small style={{ color: 'var(--color-text-muted)' }}>—</small>
                        )}
                        {p.attempts > 1 && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            Intento {p.attempts}/4
                          </div>
                        )}
                      </td>
                      <td>
                        <small>{p.created}</small>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-message">
                      No se registran propuestas voluntarias en el backend aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}

