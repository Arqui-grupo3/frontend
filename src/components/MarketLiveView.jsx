import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { dataService } from '../services/dataService'

const formatNumber = (val) => {
  const num = Number(val)
  return isNaN(num) ? '0' : new Intl.NumberFormat('es-CL').format(num)
}

const KNOWN_CITIES = {
  HGW: 'Hogwarts',
  COR: 'Coruscant',
  RAP: 'Rapture',
  TAL: 'Talca',
  LSN: 'Los Santos',
  MTI: 'Minas Tirith',
  SPR: 'Springfield',
  NNY: 'New New York',
  KLD: "King's Landing",
  TAR: 'Tar Valon',
  TK3: 'Tokyo-3',
  MET: 'Metropolis (Central)',
  REE: 'EnergyShark (REE)',
}

export function MarketLiveView() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [marketData, setMarketData] = useState({ offers: [], distanceTableMeta: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('effectivePrice') // 'effectivePrice' | 'remaining' | 'city'

  const loadMarket = async () => {
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
      const data = await dataService.getLiveMarket(token)
      setMarketData(data)
    } catch (err) {
      setError(err.message || 'Error al conectar con el libro de mercado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMarket()
    const timer = setInterval(loadMarket, 15000) // refresco automático cada 15s
    return () => clearInterval(timer)
  }, [isAuthenticated, getAccessToken])

  const sortedOffers = [...(marketData.offers || [])].sort((a, b) => {
    if (sortBy === 'effectivePrice') {
      return a.effectivePricePerEnergy - b.effectivePricePerEnergy
    }
    if (sortBy === 'remaining') {
      return b.remaining - a.remaining
    }
    return a.cityId.localeCompare(b.cityId)
  })

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Mercado Descentralizado · RF02</p>
          <h1>Mercado en Vivo</h1>
          <p>
            Libro de ofertas vigentes en el feed de mercado, con distancias calculadas, tarifas de transporte y precio efectivo real.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="audit-pagination-btn"
            onClick={loadMarket}
            disabled={loading}
          >
            {loading ? 'Actualizando...' : '↻ Refrescar'}
          </button>
          <span className="badge">
            {sortedOffers.length} ofertas activas
          </span>
        </div>
      </div>

      {error && (
        <div className="alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
          <strong>Error de conexión:</strong> {error}
        </div>
      )}

      {/* Tarjeta de métricas del mercado */}
      <div className="balances" style={{ marginBottom: '1.5rem' }}>
        <div className="balance-card">
          <span>Tarifa Base de Transporte</span>
          <strong>${marketData.distanceTableMeta.baseTransportRate ?? 0.05} <small>cr / km</small></strong>
        </div>
        <div className="balance-card" style={{ borderLeft: '4px solid #EF4444' }}>
          <span>Tarifa Ruta Caída (Penalización)</span>
          <strong>${marketData.distanceTableMeta.disabledTransportRate ?? 0.50} <small>cr / km</small></strong>
        </div>
        <div className="balance-card balance-energy">
          <span>Mejor Precio Efectivo</span>
          <strong>
            {sortedOffers.length > 0 ? `$${formatNumber(sortedOffers[0].effectivePricePerEnergy)}` : '—'} <small>cr / kWh</small>
          </strong>
        </div>
      </div>

      {/* Controles de orden */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Ordenar ofertas por:</span>
          <button
            type="button"
            className={`audit-pagination-btn ${sortBy === 'effectivePrice' ? 'active' : ''}`}
            onClick={() => setSortBy('effectivePrice')}
            style={sortBy === 'effectivePrice' ? { background: '#DEF7EC', borderColor: '#03543F', fontWeight: 'bold' } : {}}
          >
            Precio Efectivo (Más conveniente)
          </button>
          <button
            type="button"
            className={`audit-pagination-btn ${sortBy === 'remaining' ? 'active' : ''}`}
            onClick={() => setSortBy('remaining')}
            style={sortBy === 'remaining' ? { background: '#DEF7EC', borderColor: '#03543F', fontWeight: 'bold' } : {}}
          >
            Mayor Remanente
          </button>
        </div>
        <small style={{ color: 'var(--color-text-muted)' }}>
          Fórmula: <code>Precio Efectivo = Precio Oferta + (Distancia × Tarifa)</code>
        </small>
      </div>

      {/* Tabla de libro de ofertas */}
      {loading && sortedOffers.length === 0 ? (
        <div className="loading-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <p>Consultando ofertas activas en el libro de mercado...</p>
        </div>
      ) : sortedOffers.length === 0 ? (
        <div className="table-card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <h3>Sin ofertas vigentes en este momento</h3>
          <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
            No hay vendedores con energía remanente publicada en el ciclo activo. Las ofertas se actualizarán automáticamente cuando las ciudades emitan en <code>market.*</code>.
          </p>
        </div>
      ) : (
        <div className="table-card" style={{ padding: '0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#0B3540', color: '#FFFFFF' }}>
                <th style={{ padding: '12px 14px' }}>Ciudad Vendedora</th>
                <th style={{ padding: '12px 14px' }}>Remanente / Total</th>
                <th style={{ padding: '12px 14px' }}>Precio Base</th>
                <th style={{ padding: '12px 14px' }}>Distancia REE</th>
                <th style={{ padding: '12px 14px' }}>Peaje Transporte</th>
                <th style={{ padding: '12px 14px', background: '#087782' }}>Precio Efectivo</th>
                <th style={{ padding: '12px 14px' }}>Estado de Ruta</th>
              </tr>
            </thead>
            <tbody>
              {sortedOffers.map((o) => {
                const cityName = KNOWN_CITIES[o.cityId] || o.cityId
                return (
                  <tr
                    key={o.offerId}
                    style={{
                      borderBottom: '1px solid #DCE5E7',
                      background: o.isRouteDisabled ? '#FFF5F5' : '#FFFFFF',
                      opacity: o.isRouteDisabled ? 0.75 : 1,
                    }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-abyssal)' }}>
                        {o.cityId}
                      </div>
                      <small style={{ color: 'var(--color-text-muted)' }}>{cityName}</small>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <strong style={{ fontSize: '14px', color: '#087782' }}>{formatNumber(o.remaining)}</strong>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}> / {formatNumber(o.quantity)} kWh</span>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      ${formatNumber(o.pricePerEnergy)} <small style={{ color: 'var(--color-text-muted)' }}>cr/kWh</small>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {o.distanceKm > 0 ? `${formatNumber(o.distanceKm)} km` : 'Local'}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      +${formatNumber(o.transportPerKwh)} <small style={{ color: 'var(--color-text-muted)' }}>cr/kWh</small>
                    </td>

                    <td style={{ padding: '12px 14px', background: o.isRouteDisabled ? '#FDE8E8' : '#EEF5F6' }}>
                      <strong style={{
                        fontSize: '15px',
                        color: o.isRouteDisabled ? '#9B1C1C' : '#03543F',
                        fontFamily: 'monospace',
                      }}>
                        ${formatNumber(o.effectivePricePerEnergy)}
                      </strong>
                      <span style={{ fontSize: '11px', display: 'block', color: 'var(--color-text-muted)' }}>
                        créditos / kWh
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {o.isRouteDisabled ? (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: '#FDE8E8',
                          color: '#9B1C1C',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          border: '1px solid #F8B4B4',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          ⚠ RUTA DESHABILITADA
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: '#DEF7EC',
                          color: '#03543F',
                          fontWeight: '500',
                          fontSize: '11px',
                        }}>
                          ✓ Ruta Habilitada
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
