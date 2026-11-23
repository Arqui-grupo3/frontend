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

export function MarketAdminView() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [config, setConfig] = useState({
    offerPrice: 220.00,
    offerQuantity: 500,
    sellerPolicy: 'FCFS',
    buySpanSeconds: 360,
    buyerPolicy: 'LOWEST_EFFECTIVE_PRICE',
    marketEnabled: true,
  })
  const [swaps, setSwaps] = useState({ sellerBids: [], walletOperations: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      let token = null
      if (isAuthenticated && getAccessToken) {
        token = await getAccessToken({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.fasantamaria.me',
          },
        }).catch(() => null)
      }
      const [cfg, sw] = await Promise.all([
        dataService.getAdminConfig(token),
        dataService.getAdminSwaps(token),
      ])
      if (cfg) setConfig(cfg)
      if (sw) setSwaps(sw)
    } catch (err) {
      setError(err.message || 'Error al cargar administración')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [isAuthenticated, getAccessToken])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)
    setError(null)
    try {
      let token = null
      if (isAuthenticated && getAccessToken) {
        token = await getAccessToken({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.fasantamaria.me',
          },
        }).catch(() => null)
      }
      const updated = await dataService.updateAdminConfig(config, token)
      setConfig(updated)
      setFeedback('¡Configuración guardada exitosamente! Aplicará en el siguiente ciclo sin redeploy (AD6).')
      setTimeout(() => setFeedback(null), 6000)
    } catch (err) {
      setError(err.message || 'Error al actualizar configuración')
    } finally {
      setSaving(false)
    }
  }

  const allSwaps = [
    ...(swaps.sellerBids || []).map((b) => ({
      id: b.swapId || b.bidId,
      counterparty: b.counterpartyCity || 'Desconocida',
      role: 'Vendedor',
      quantity: b.quantity,
      status: b.status,
      time: b.updatedAt,
    })),
    ...(swaps.walletOperations || []).filter((w) => w.swapId).map((w) => ({
      id: w.swapId,
      counterparty: 'Red / Central',
      role: w.opType === 'propose-swap' ? 'Vendedor' : 'Comprador',
      quantity: w.payload?.quantity || '—',
      status: w.status,
      time: w.updatedAt,
    })),
  ]

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Control Operativo · RF04 / AD6</p>
          <h1>Administración del Mercado</h1>
          <p>
            Ajuste en tiempo real de precios, cuotas y políticas de compra/venta. Los cambios aplican en el siguiente ciclo sin necesidad de reiniciar ni redesplegar.
          </p>
        </div>
        <button
          type="button"
          className="audit-pagination-btn"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? 'Cargando...' : '↻ Refrescar'}
        </button>
      </div>

      {feedback && (
        <div style={{
          background: '#DEF7EC',
          color: '#03543F',
          padding: '12px 16px',
          borderRadius: '6px',
          border: '1px solid #31C48D',
          marginBottom: '1.25rem',
          fontSize: '14px',
          fontWeight: '500',
        }}>
          ✓ {feedback}
        </div>
      )}

      {error && (
        <div className="alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Formulario de Configuración de Estrategia */}
      <form onSubmit={handleSave} className="table-card" style={{ padding: '24px', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--color-abyssal)' }}>
          Parámetros de Estrategia y Negociación (AD6)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Columna Vendedor */}
          <div style={{ background: '#F8FAFA', padding: '16px', borderRadius: '8px', border: '1px solid #DCE5E7' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#087782', marginBottom: '12px' }}>
              Estrategia de Venta (Nuestra Oferta)
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Precio de Oferta ($ créditos / kWh)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={config.offerPrice}
                onChange={(e) => setConfig({ ...config, offerPrice: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DCE5E7' }}
              />
              <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                Precio unitario publicado en <code>market.REE</code>
              </small>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Cantidad a Ofertar (kWh)
              </label>
              <input
                type="number"
                min="1"
                required
                value={config.offerQuantity}
                onChange={(e) => setConfig({ ...config, offerQuantity: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DCE5E7' }}
              />
              <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                Energía remanente disponible para la venta
              </small>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Política de Aceptación de Bids
              </label>
              <select
                value={config.sellerPolicy}
                onChange={(e) => setConfig({ ...config, sellerPolicy: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DCE5E7', background: '#FFFFFF' }}
              >
                <option value="FCFS">FCFS (Primer bid en llegar, serializado)</option>
                <option value="PRIORITY_VOLUME">Priorizar Mayor Volumen</option>
                <option value="MET_NEUTRAL">Competir con MET</option>
              </select>
            </div>
          </div>

          {/* Columna Comprador */}
          <div style={{ background: '#F8FAFA', padding: '16px', borderRadius: '8px', border: '1px solid #DCE5E7' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0B3540', marginBottom: '12px' }}>
              Estrategia de Compra (Déficit y Span)
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Tiempo de Espera de Compra (Span en segundos)
              </label>
              <input
                type="number"
                min="0"
                max="600"
                required
                value={config.buySpanSeconds}
                onChange={(e) => setConfig({ ...config, buySpanSeconds: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DCE5E7' }}
              />
              <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                Segundos que el comprador espera antes de comprar (ej. 360s = 6 min para precios bajos de MET)
              </small>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Política de Selección de Ofertas
              </label>
              <select
                value={config.buyerPolicy}
                onChange={(e) => setConfig({ ...config, buyerPolicy: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DCE5E7', background: '#FFFFFF' }}
              >
                <option value="LOWEST_EFFECTIVE_PRICE">Menor Precio Efectivo (Precio + Transporte)</option>
                <option value="MET_PREFERENCE">Preferir Metropolis (MET)</option>
                <option value="SHORTEST_DISTANCE">Menor Distancia de Red</option>
              </select>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.marketEnabled}
                  onChange={(e) => setConfig({ ...config, marketEnabled: e.target.checked })}
                />
                Participación en el Mercado Activa (Kill-switch)
              </label>
              <small style={{ color: 'var(--color-text-muted)', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                Si se desactiva, el nodo no compra ni vende (solo reporta a la central).
              </small>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            type="submit"
            className="audit-pagination-btn"
            disabled={saving}
            style={{
              background: '#087782',
              color: '#FFFFFF',
              fontWeight: 'bold',
              padding: '10px 24px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '6px',
            }}
          >
            {saving ? 'Guardando en BD...' : '💾 Guardar Configuración en Caliente (AD6)'}
          </button>
        </div>
      </form>

      {/* Tabla de Swaps en Curso */}
      <div className="table-card" style={{ padding: '0', overflowX: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #DCE5E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-abyssal)', margin: 0 }}>
            Swaps en Curso y Estado de Negociaciones ({allSwaps.length})
          </h2>
          <small style={{ color: 'var(--color-text-muted)' }}>Actualizado en vivo</small>
        </div>

        {allSwaps.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No hay swaps en proceso ni registrados en la sesión actual.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#EEF5F6' }}>
                <th style={{ padding: '10px 14px' }}>Swap / Bid ID</th>
                <th style={{ padding: '10px 14px' }}>Contraparte</th>
                <th style={{ padding: '10px 14px' }}>Rol</th>
                <th style={{ padding: '10px 14px' }}>Cantidad</th>
                <th style={{ padding: '10px 14px' }}>Estado</th>
                <th style={{ padding: '10px 14px' }}>Última Actualización</th>
              </tr>
            </thead>
            <tbody>
              {allSwaps.map((s, idx) => (
                <tr key={`${s.id}-${idx}`} style={{ borderBottom: '1px solid #EEF5F6' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px' }}>
                    {s.id}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: '500' }}>
                    {s.counterparty}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                      background: s.role === 'Vendedor' ? '#E0F2FE' : '#FEF3C7',
                      color: s.role === 'Vendedor' ? '#0369A1' : '#92400E',
                    }}>
                      {s.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {typeof s.quantity === 'number' ? `${formatNumber(s.quantity)} kWh` : s.quantity}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                      background: s.status === 'settled' || s.status === 'resolved' ? '#DEF7EC'
                        : s.status === 'rejected' || s.status === 'failed' ? '#FDE8E8' : '#FEF08A',
                      color: s.status === 'settled' || s.status === 'resolved' ? '#03543F'
                        : s.status === 'rejected' || s.status === 'failed' ? '#9B1C1C' : '#713F12',
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {formatTime(s.time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
