import { useState, useEffect, useCallback } from 'react'
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

function toFormConfig(cfg) {
  if (!cfg) {
    return {
      version: null,
      priceFactor: 0.85,
      maxQuantity: '',
      priceDecayMinutes: 0,
      spanSeconds: 390,
      marketEnabled: true,
      note: '',
      updatedBy: null,
      createdAt: null,
    }
  }
  return {
    version: cfg.version ?? null,
    priceFactor: cfg.priceFactor ?? 0.85,
    maxQuantity: cfg.maxQuantity === null || cfg.maxQuantity === undefined ? '' : String(cfg.maxQuantity),
    priceDecayMinutes: cfg.priceDecayMinutes ?? 0,
    spanSeconds: cfg.spanSeconds ?? 390,
    marketEnabled: Boolean(cfg.marketEnabled),
    note: '',
    updatedBy: cfg.updatedBy || null,
    createdAt: cfg.createdAt || null,
  }
}

export function MarketAdminView() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [config, setConfig] = useState(() => toFormConfig(null))
  const [history, setHistory] = useState([])
  const [swaps, setSwaps] = useState({ sellerBids: [], walletOperations: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)

  const resolveToken = useCallback(async () => {
    if (!isAuthenticated || !getAccessToken) return null
    return await getAccessToken({
      authorizationParams: {
        audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.fasantamaria.me',
      },
    }).catch(() => null)
  }, [isAuthenticated, getAccessToken])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await resolveToken()
      const [cfg, hist, sw] = await Promise.all([
        dataService.getAdminConfig(token),
        dataService.getConfigHistory(15, token).catch(() => []),
        dataService.getAdminSwaps(token).catch(() => ({ sellerBids: [], walletOperations: [] })),
      ])
      if (cfg) setConfig(toFormConfig(cfg))
      setHistory(Array.isArray(hist) ? hist : [])
      if (sw) setSwaps(sw)
    } catch (err) {
      setError(err.message || 'Error al cargar administración')
    } finally {
      setLoading(false)
    }
  }, [resolveToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)
    setError(null)
    try {
      const token = await resolveToken()
      const updated = await dataService.updateAdminConfig(config, token)
      setConfig(toFormConfig(updated))

      const hist = await dataService.getConfigHistory(15, token).catch(() => null)
      if (Array.isArray(hist)) setHistory(hist)

      const withdrawn = Array.isArray(updated?.withdrawnOffers) ? updated.withdrawnOffers : []
      const withdrawnMsg = withdrawn.length > 0
        ? ` Se retiraron ${withdrawn.length} oferta(s) activa(s) de inmediato.`
        : ''
      setFeedback(
        `¡Versión v${updated?.version ?? '?'} guardada en strategy_config! `
        + 'Precio, cantidad y span aplican desde el próximo ciclo; el interruptor rige de inmediato.'
        + withdrawnMsg
      )
      setTimeout(() => setFeedback(null), 7000)
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
            Configuración versionada en caliente (<code>strategy_config</code>). Cada guardado crea una nueva versión inmutable: precio, tope y span se congelan al iniciar el próximo ciclo; el kill-switch rige de inmediato.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {config.version !== null && (
            <span className="badge">
              Vigente: v{config.version}
            </span>
          )}
          <button
            type="button"
            className="audit-pagination-btn"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? 'Cargando...' : '↻ Refrescar'}
          </button>
        </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--color-abyssal)' }}>
            Parámetros de Estrategia (AD6)
          </h2>
          {config.createdAt && (
            <small style={{ color: 'var(--color-text-muted)' }}>
              Última versión: v{config.version} · {formatTime(config.createdAt)}
              {config.updatedBy ? ` · por ${config.updatedBy}` : ''}
            </small>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Columna Vendedor */}
          <div style={{ background: '#F8FAFA', padding: '16px', borderRadius: '8px', border: '1px solid #DCE5E7' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#087782', marginBottom: '12px' }}>
              Estrategia de Venta (Oferta REE)
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="priceFactor" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Factor de Precio (<code>priceFactor</code>)
              </label>
              <input
                id="priceFactor"
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                required
                value={config.priceFactor}
                onChange={(e) => setConfig({ ...config, priceFactor: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DCE5E7' }}
              />
              <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                Fracción sobre <code>imbalancePrice</code> (0.01 a 1.00). Nunca baja de 1.05 × costo propio.
              </small>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="maxQuantity" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Tope de Cantidad a Ofertar (kWh)
              </label>
              <input
                id="maxQuantity"
                type="number"
                min="0"
                step="1"
                placeholder="Vacío = ofrecer todo el excedente"
                value={config.maxQuantity}
                onChange={(e) => setConfig({ ...config, maxQuantity: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DCE5E7' }}
              />
              <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                Entero ≥ 0, o dejar vacío (<code>null</code>) para publicar todo lo vendible.
              </small>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label htmlFor="priceDecayMinutes" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Bajada Gradual de Precio (minutos)
              </label>
              <input
                id="priceDecayMinutes"
                type="number"
                min="0"
                max="8"
                step="1"
                required
                value={config.priceDecayMinutes}
                onChange={(e) => setConfig({ ...config, priceDecayMinutes: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DCE5E7' }}
              />
              <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                0 = precio fijo; 1 a 8 = minutos de decaimiento hacia el piso de venta.
              </small>
            </div>
          </div>

          {/* Columna Comprador y Control */}
          <div style={{ background: '#F8FAFA', padding: '16px', borderRadius: '8px', border: '1px solid #DCE5E7' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0B3540', marginBottom: '12px' }}>
              Estrategia de Compra y Control
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="spanSeconds" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Tiempo de Espera de Compra (<code>spanSeconds</code>)
              </label>
              <input
                id="spanSeconds"
                type="number"
                min="0"
                max="540"
                step="1"
                required
                value={config.spanSeconds}
                onChange={(e) => setConfig({ ...config, spanSeconds: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DCE5E7' }}
              />
              <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                Segundos desde <code>opensAt</code> antes de enviar el bid (0 a 540 s).
              </small>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="configNote" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Nota del Cambio (opcional)
              </label>
              <input
                id="configNote"
                type="text"
                maxLength={500}
                placeholder="Ej: Ajuste para demo / prueba de span 420s"
                value={config.note}
                onChange={(e) => setConfig({ ...config, note: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DCE5E7' }}
              />
            </div>

            <div style={{ marginTop: '16px', padding: '10px 12px', borderRadius: '6px', background: config.marketEnabled ? '#DEF7EC' : '#FDE8E8', border: `1px solid ${config.marketEnabled ? '#31C48D' : '#F8B4B4'}` }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: config.marketEnabled ? '#03543F' : '#9B1C1C' }}>
                <input
                  type="checkbox"
                  checked={config.marketEnabled}
                  onChange={(e) => setConfig({ ...config, marketEnabled: e.target.checked })}
                />
                Participación en el Mercado Activa (Kill-switch)
              </label>
              <small style={{ color: config.marketEnabled ? '#03543F' : '#9B1C1C', fontSize: '11px', display: 'block', marginTop: '4px', opacity: 0.9 }}>
                {config.marketEnabled
                  ? 'El nodo compra y vende según la versión vigente.'
                  : 'Apagado: al guardar se retiran ofertas activas al instante y solo se reporta a la central.'}
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
            {saving ? 'Guardando versión...' : '💾 Guardar Nueva Versión (AD6)'}
          </button>
        </div>
      </form>

      {/* Historial de Versiones de Estrategia (ADR 0006) */}
      <div className="table-card" style={{ padding: '0', overflowX: 'auto', marginBottom: '2rem' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #DCE5E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-abyssal)', margin: 0 }}>
            Historial de Versiones de Estrategia ({history.length})
          </h2>
          <small style={{ color: 'var(--color-text-muted)' }}>Append-only · ADR 0006</small>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No hay versiones registradas.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#EEF5F6' }}>
                <th style={{ padding: '10px 14px' }}>Versión</th>
                <th style={{ padding: '10px 14px' }}>Mercado</th>
                <th style={{ padding: '10px 14px' }}>Factor Precio</th>
                <th style={{ padding: '10px 14px' }}>Tope kWh</th>
                <th style={{ padding: '10px 14px' }}>Span</th>
                <th style={{ padding: '10px 14px' }}>Decay</th>
                <th style={{ padding: '10px 14px' }}>Nota</th>
                <th style={{ padding: '10px 14px' }}>Hora</th>
              </tr>
            </thead>
            <tbody>
              {history.map((v) => (
                <tr key={v.version} style={{ borderBottom: '1px solid #EEF5F6', background: v.version === config.version ? '#F0FDFA' : 'transparent' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>
                    v{v.version} {v.version === config.version && <small style={{ color: '#087782' }}>(actual)</small>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                      background: v.marketEnabled ? '#DEF7EC' : '#FDE8E8',
                      color: v.marketEnabled ? '#03543F' : '#9B1C1C',
                    }}>
                      {v.marketEnabled ? 'ACTIVO' : 'APAGADO'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{v.priceFactor}</td>
                  <td style={{ padding: '10px 14px' }}>{v.maxQuantity === null ? 'Sin tope' : `${formatNumber(v.maxQuantity)} kWh`}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{v.spanSeconds}s</td>
                  <td style={{ padding: '10px 14px' }}>{v.priceDecayMinutes} min</td>
                  <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>{v.note || '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {formatTime(v.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
