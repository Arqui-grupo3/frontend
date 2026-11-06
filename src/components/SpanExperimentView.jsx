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

export function SpanExperimentView() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [data, setData] = useState({ cycles: [], aggregated: [], currentSpan: 360 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadExperiment = async () => {
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
      const res = await dataService.getSpanExperiment(token)
      setData(res)
    } catch (err) {
      setError(err.message || 'Error al consultar experimento de span')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExperiment()
  }, [isAuthenticated, getAccessToken])

  const totalCycles = data.cycles.length
  const totalSavings = data.cycles.reduce((acc, c) => acc + (c.savingsCredits || 0), 0)
  const totalDeficit = data.cycles.reduce((acc, c) => acc + (c.deficitKwh || 0), 0)
  const totalMarket = data.cycles.reduce((acc, c) => acc + (c.marketKwh || 0), 0)
  const coverageOverall = totalDeficit > 0 ? Math.round((totalMarket / totalDeficit) * 1000) / 10 : 100

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Evaluación Experimental · RF06</p>
          <h1>Experimento de Span</h1>
          <p>
            Análisis de rentabilidad y cobertura energética según el tiempo de espera de compra (*span*). Demuestra el ahorro obtenido frente a la penalización de la central (*baseline*).
          </p>
        </div>
        <button
          type="button"
          className="audit-pagination-btn"
          onClick={loadExperiment}
          disabled={loading}
        >
          {loading ? 'Cargando...' : '↻ Refrescar'}
        </button>
      </div>

      {error && (
        <div className="alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tarjetas de Resumen Global */}
      <div className="balances" style={{ marginBottom: '2rem' }}>
        <div className="balance-card">
          <span>Span Actual en Operación</span>
          <strong>{data.currentSpan} <small>segundos ({Math.round(data.currentSpan / 60)} min)</small></strong>
        </div>
        <div className="balance-card balance-energy">
          <span>Ahorro Acumulado vs Baseline</span>
          <strong>${formatNumber(totalSavings)} <small>créditos</small></strong>
        </div>
        <div className="balance-card">
          <span>Cobertura Global de Déficit</span>
          <strong>{coverageOverall}% <small>vía mercado</small></strong>
        </div>
      </div>

      {/* 1. Tabla de Datos Agregados por Valor de Span */}
      <div className="table-card" style={{ padding: '0', marginBottom: '2rem', overflowX: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #DCE5E7' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-abyssal)', margin: 0 }}>
            Resultados Agregados por Valor de Span
          </h2>
          <small style={{ color: 'var(--color-text-muted)' }}>
            Comparativa de eficiencia económica según los minutos de espera
          </small>
        </div>

        {data.aggregated.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No hay ciclos suficientes para agregar métricas por span aún.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#0B3540', color: '#FFFFFF' }}>
                <th style={{ padding: '12px 14px' }}>Valor de Span</th>
                <th style={{ padding: '12px 14px' }}>Ciclos Evaluados</th>
                <th style={{ padding: '12px 14px' }}>Déficit Total</th>
                <th style={{ padding: '12px 14px' }}>Comprado en Mercado</th>
                <th style={{ padding: '12px 14px' }}>Cobertura</th>
                <th style={{ padding: '12px 14px', background: '#087782' }}>Ahorro Promedio / Ciclo</th>
                <th style={{ padding: '12px 14px' }}>Bids Rechazados</th>
              </tr>
            </thead>
            <tbody>
              {data.aggregated.map((aggr) => (
                <tr key={aggr.spanSeconds} style={{ borderBottom: '1px solid #DCE5E7' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 'bold', fontSize: '14px' }}>
                    {aggr.spanSeconds} s ({Math.round(aggr.spanSeconds / 60)} min)
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {aggr.cycleCount} ciclos
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {formatNumber(aggr.totalDeficitKwh)} kWh
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {formatNumber(aggr.totalMarketKwh)} kWh
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                      background: aggr.marketCoveragePct >= 80 ? '#DEF7EC' : '#FEF3C7',
                      color: aggr.marketCoveragePct >= 80 ? '#03543F' : '#92400E',
                    }}>
                      {aggr.marketCoveragePct}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', background: '#EEF5F6' }}>
                    <strong style={{ fontSize: '14px', color: '#03543F' }}>
                      +${formatNumber(aggr.avgSavingsCredits)} cr
                    </strong>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {aggr.totalRejectedBids}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 2. Tabla Detallada Ciclo a Ciclo */}
      <div className="table-card" style={{ padding: '0', overflowX: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #DCE5E7' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-abyssal)', margin: 0 }}>
            Registro Histórico Ciclo a Ciclo ({totalCycles})
          </h2>
          <small style={{ color: 'var(--color-text-muted)' }}>
            Auditoría de déficit, compras en mercado, costos frente al baseline y rechazos por ciclo
          </small>
        </div>

        {data.cycles.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Sin ciclos evaluados en la base de datos.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#EEF5F6' }}>
                <th style={{ padding: '10px 14px' }}>Ciclo</th>
                <th style={{ padding: '10px 14px' }}>Span Usado</th>
                <th style={{ padding: '10px 14px' }}>Déficit kWh</th>
                <th style={{ padding: '10px 14px' }}>Mercado / Multa</th>
                <th style={{ padding: '10px 14px' }}>Costo Pagado</th>
                <th style={{ padding: '10px 14px' }}>Baseline (Central)</th>
                <th style={{ padding: '10px 14px' }}>Ahorro Neto</th>
                <th style={{ padding: '10px 14px' }}>Rechazados</th>
              </tr>
            </thead>
            <tbody>
              {data.cycles.map((c) => (
                <tr key={c.cycleId} style={{ borderBottom: '1px solid #EEF5F6' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <strong style={{ fontSize: '13px' }}>{c.cycleId}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {formatTime(c.startedAt)}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>
                    {c.spanSeconds} s
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {formatNumber(c.deficitKwh)} kWh
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: '#03543F', fontWeight: 'bold' }}>{formatNumber(c.marketKwh)}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}> / {formatNumber(c.penaltyKwh)}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    ${formatNumber(c.effectivePaidCredits)} cr
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                    ${formatNumber(c.baselineCredits)} cr
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <strong style={{ color: c.savingsCredits > 0 ? '#03543F' : 'inherit' }}>
                      {c.savingsCredits > 0 ? `+$${formatNumber(c.savingsCredits)}` : '$0'}
                    </strong>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {c.rejectedBids > 0 ? (
                      <span style={{ color: '#9B1C1C', fontWeight: 'bold' }}>{c.rejectedBids}</span>
                    ) : (
                      '0'
                    )}
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
