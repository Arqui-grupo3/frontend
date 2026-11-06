import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { dataService } from '../services/dataService'

const fmtInt = (n) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('es-CL'))
const fmtNum = (n, digits = 2) =>
  n === null || n === undefined ? '—' : Number(n).toLocaleString('es-CL', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const fmtPct = (n) => (n === null || n === undefined ? '—' : `${Number(n).toLocaleString('es-CL', { maximumFractionDigits: 1 })} %`)
const fmtSpan = (s) => (s === null || s === undefined ? '—' : `${s} s (T+${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')})`)

export function SpanExperimentView() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [data, setData] = useState({ since: null, summary: [], cycles: [], book: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [onlyDeficit, setOnlyDeficit] = useState(true)
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Cargar el experimento de span desde el backend
  useEffect(() => {
    let isMounted = true

    async function fetchExperiment() {
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
          } catch (tokenErr) {
            console.warn('[SpanExperimentView] Error obteniendo token:', tokenErr)
          }
        }

        const res = await dataService.getSpanExperiment({ onlyDeficit, limit: 100 }, token)
        if (isMounted) setData(res)
      } catch (err) {
        console.error('[SpanExperimentView] Error cargando el experimento de span:', err)
        if (isMounted) setError(err.message || 'Error al conectar con el servicio del experimento')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchExperiment()

    return () => {
      isMounted = false
    }
  }, [onlyDeficit, refreshIndex, isAuthenticated, getAccessToken])

  const handleRefresh = () => setRefreshIndex((prev) => prev + 1)

  // Totales de los ciclos con déficit, sumando todos los spans
  const totals = (data.summary || []).reduce(
    (acc, s) => ({
      cycles: acc.cycles + (s.cycles || 0),
      deficit: acc.deficit + (s.deficitKwh || 0),
      covered: acc.covered + (s.coveredKwh || 0),
      baseline: acc.baseline + (s.baseline || 0),
      savings: acc.savings + (s.savings || 0),
    }),
    { cycles: 0, deficit: 0, covered: 0, baseline: 0, savings: 0 }
  )

  const bestBook = (data.book || []).reduce(
    (best, b) => (b.avgBestPrice !== null && (best === null || b.avgBestPrice < best.avgBestPrice) ? b : best),
    null
  )

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Estrategia del Comprador · RF06</p>
          <h1>Experimento de Span</h1>
          <p>
            Cuánto conviene esperar desde <code>opensAt</code> antes de enviar el bid: precio pagado, déficit cubierto y ahorro frente a no comprar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="filter-btn"
            onClick={handleRefresh}
            title="Refrescar experimento"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>🔄</span> Actualizar
          </button>
          <span className="badge">RF06</span>
        </div>
      </div>

      <div className="info-box">
        <strong>Experimento de span (RF06):</strong> el span es un parámetro de <code>/config</code> que cambia sin redeploy, y cada ciclo queda atribuido a la versión de configuración que congeló (ADR AD6).
        El ahorro se mide como en el leaderboard: <code>baseline = déficit × imbalancePrice</code> (no comprar) menos el costo real (compras + transporte + kWh no cubiertos × <code>imbalancePrice</code>).
        {data.since && <> Datos desde el {new Date(data.since).toLocaleString('es-CL')}.</>}
      </div>

      {error && (
        <div className="info-box" style={{ background: '#FFF0F0', borderColor: '#FFB8B8', color: '#900' }}>
          <strong>Error de conexión:</strong> {error}
          <div style={{ marginTop: '8px' }}>
            <button type="button" className="filter-btn" onClick={handleRefresh}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="table-card">
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p>Calculando el experimento de span en la base de datos...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Indicadores generales */}
          <div className="balances span-kpis">
            <div className="balance-card">
              <span>Ciclos con déficit</span>
              <strong>{fmtInt(totals.cycles)}</strong>
              <small>{(data.summary || []).length} valor{(data.summary || []).length === 1 ? '' : 'es'} de span probado{(data.summary || []).length === 1 ? '' : 's'}</small>
            </div>
            <div className="balance-card">
              <span>Déficit cubierto vía mercado</span>
              <strong>{fmtPct(totals.deficit > 0 ? (100 * totals.covered) / totals.deficit : null)}</strong>
              <small>{fmtInt(totals.covered)} de {fmtInt(totals.deficit)} kWh</small>
            </div>
            <div className="balance-card">
              <span>Ahorro frente al baseline</span>
              <strong>{fmtPct(totals.baseline > 0 ? (100 * totals.savings) / totals.baseline : null)}</strong>
              <small>{fmtNum(totals.savings, 0)} CR de {fmtNum(totals.baseline, 0)} CR</small>
            </div>
            <div className="balance-card balance-energy">
              <span>Mejor precio disponible en el libro</span>
              <strong>{bestBook ? fmtPct(bestBook.bestPricePctOfImbalance) : '—'}</strong>
              <small>{bestBook ? `del imbalancePrice, con span ${fmtSpan(bestBook.spanSeconds)}` : 'Sin datos del feed de mercado'}</small>
            </div>
          </div>

          {/* Agregado por valor de span */}
          <div className="table-card" style={{ marginBottom: '24px' }}>
            <h2>Resultado por valor de span</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Span</th>
                  <th>Ciclos</th>
                  <th>Déficit cubierto</th>
                  <th>Precio efectivo prom.</th>
                  <th>Ahorro vs. baseline</th>
                  <th>Bids enviados / rechazados</th>
                  <th>Ciclos sin compra</th>
                </tr>
              </thead>
              <tbody>
                {(data.summary || []).length > 0 ? (
                  data.summary.map((s) => (
                    <tr key={s.spanSeconds}>
                      <td><strong>{fmtSpan(s.spanSeconds)}</strong></td>
                      <td>{fmtInt(s.cycles)}</td>
                      <td>
                        <span className={`status-pill ${s.coveragePct > 0 ? 'pill-active' : 'pill-error'}`}>{fmtPct(s.coveragePct)}</span>
                      </td>
                      <td>{s.avgEffectivePrice === null ? '—' : `${fmtNum(s.avgEffectivePrice)} CR/kWh`}</td>
                      <td>{fmtPct(s.savingsPct)}</td>
                      <td>{fmtInt(s.bidsTotal)} / {fmtInt(s.bidsRejected)}</td>
                      <td>{fmtInt(s.cyclesWithoutPurchase)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="empty-message">
                      Todavía no hay ciclos con déficit en el periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Contrafactual del libro */}
          <div className="table-card" style={{ marginBottom: '24px' }}>
            <h2>Qué había en el libro en cada span</h2>
            <p className="field-note" style={{ marginTop: 0 }}>
              Reconstruido desde <code>market.REE</code> para cada ciclo con déficit, aunque no se haya enviado bid. Precio sin transporte;
              el <code>remaining</code> es el que publicó el vendedor, así que la cobertura es un techo.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Span candidato</th>
                  <th>Ciclos</th>
                  <th>Ofertas vivas prom.</th>
                  <th>Mejor precio prom.</th>
                  <th>Precio MET prom.</th>
                  <th>% del imbalancePrice</th>
                  <th>El libro cubre el déficit</th>
                  <th>Ciclos sin ofertas</th>
                </tr>
              </thead>
              <tbody>
                {(data.book || []).length > 0 ? (
                  data.book.map((b) => (
                    <tr key={b.spanSeconds}>
                      <td><strong>{fmtSpan(b.spanSeconds)}</strong></td>
                      <td>{fmtInt(b.cycles)}</td>
                      <td>{fmtNum(b.avgLiveOffers, 1)}</td>
                      <td>{b.avgBestPrice === null ? '—' : `${fmtNum(b.avgBestPrice)} CR/kWh`}</td>
                      <td>{b.avgMetPrice === null ? '—' : `${fmtNum(b.avgMetPrice)} CR/kWh`}</td>
                      <td>
                        <div className="span-bar" title={fmtPct(b.bestPricePctOfImbalance)}>
                          <div className="span-bar-fill" style={{ width: `${Math.min(Math.max(b.bestPricePctOfImbalance || 0, 0), 100)}%` }} />
                          <span>{fmtPct(b.bestPricePctOfImbalance)}</span>
                        </div>
                      </td>
                      <td>{fmtPct(b.bookCoversDeficitPct)}</td>
                      <td>{fmtInt(b.cyclesWithoutOffers)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-message">
                      No hay ofertas registradas en el feed de mercado para los ciclos con déficit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Detalle por ciclo */}
          <div className="table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Detalle por ciclo</h2>
              <div className="filter-bar">
                <button
                  type="button"
                  className={`filter-btn ${onlyDeficit ? 'active' : ''}`}
                  onClick={() => setOnlyDeficit(true)}
                >
                  Solo con déficit
                </button>
                <button
                  type="button"
                  className={`filter-btn ${!onlyDeficit ? 'active' : ''}`}
                  onClick={() => setOnlyDeficit(false)}
                >
                  Todos los ciclos
                </button>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ciclo</th>
                  <th>Span configurado / efectivo</th>
                  <th>Déficit</th>
                  <th>Cubierto vía mercado</th>
                  <th>Baseline</th>
                  <th>Costo real</th>
                  <th>Ahorro</th>
                  <th>Bids (rechazados)</th>
                </tr>
              </thead>
              <tbody>
                {(data.cycles || []).length > 0 ? (
                  data.cycles.map((c) => (
                    <tr key={c.cycleId}>
                      <td>
                        <strong>{c.cycleId}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {c.date} · {c.time} · config v{c.configVersion}
                        </div>
                      </td>
                      <td>
                        {c.spanConfigured} s / {c.spanEffective === null ? 'sin bid' : `${c.spanEffective} s`}
                      </td>
                      <td>{fmtInt(c.deficitKwh)} kWh</td>
                      <td>
                        {fmtInt(c.coveredKwh)} kWh
                        {c.coveragePct !== null && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{fmtPct(c.coveragePct)}</div>
                        )}
                      </td>
                      <td>{fmtNum(c.baseline, 0)} CR</td>
                      <td>{fmtNum(c.realCost, 0)} CR</td>
                      <td>{fmtPct(c.savingsPct)}</td>
                      <td>
                        {fmtInt(c.bidsTotal)}
                        {c.bidsRejected > 0 && <span className="text-danger"> ({fmtInt(c.bidsRejected)})</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-message">
                      No hay ciclos registrados en el periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
