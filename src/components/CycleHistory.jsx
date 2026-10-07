import { useState } from 'react'
import { dataService } from '../services/dataService'

const formatNumber = new Intl.NumberFormat('es-CL').format

export function CycleHistory() {
  const cycles = dataService.getCycles()
  const [selectedCycleId, setSelectedCycleId] = useState(cycles[0]?.id || '')

  const currentCycle = cycles.find((c) => c.id === selectedCycleId) || cycles[0]

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
        <span className="badge">Ciclos de 2 Horas</span>
      </div>

      <div className="layout">
        {/* Barra lateral de selección de ciclos */}
        <aside className="list" aria-labelledby="cycles-list-title">
          <h2 id="cycles-list-title">Ciclos</h2>
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

          <h3>Operaciones Aplicadas</h3>

          <ol className="timeline">
            {currentCycle.operations.map((op, index) => {
              const isLast = index === currentCycle.operations.length - 1
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
    </div>
  )
}
