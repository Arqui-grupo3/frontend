import { useState } from 'react'
import { dataService } from '../services/dataService'

const BASE_GENERATION_COST = 210
const PRICE_CAP = Math.round(1.05 * BASE_GENERATION_COST * 100) / 100 // 220.5

export function NegotiationView() {
  const [proposals, setProposals] = useState(dataService.getProposals())
  const [direction, setDirection] = useState('give')
  const [quantity, setQuantity] = useState(1000)
  const [pricePerEnergy, setPricePerEnergy] = useState(220.5)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedbackMsg(null)

    const numPrice = Number(pricePerEnergy)
    if (numPrice > PRICE_CAP) {
      setFeedbackMsg({
        type: 'error',
        text: `Error de validación: El precio ofertado ($${numPrice}) excede el tope máximo permitido ($${PRICE_CAP} créditos).`,
      })
      setIsSubmitting(false)
      return
    }

    const newId = `prop-${Math.floor(1000 + Math.random() * 9000)}`
    const nowStr = new Date().toLocaleTimeString('es-CL')

    const newProposal = {
      id: newId,
      direction,
      quantity: Number(quantity),
      pricePerEnergy: numPrice,
      status: 'Confirmada',
      created: nowStr,
      confirmedAt: nowStr,
      paidAt: 'En espera de transfer (≤30s)',
      cycleId: 'cycle-9431',
    }

    setTimeout(() => {
      setProposals((prev) => [newProposal, ...prev])
      setIsSubmitting(false)
      setFeedbackMsg({
        type: 'success',
        text: `Propuesta ${newId} emitida exitosamente. Confirmación de la central recibida.`,
      })
    }, 450)
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
        <span className="badge">Operaciones con Central</span>
      </div>

      <div className="two-columns">
        {/* Formulario de emisión de propuesta */}
        <section className="form-card" aria-labelledby="form-title">
          <h2 id="form-title">Nueva Propuesta</h2>
          <p className="section-hint">
            Tope de precio regulado: <strong>${PRICE_CAP} créditos</strong> (1.05 × costo base de generación).
          </p>

          {feedbackMsg && (
            <div className={feedbackMsg.type === 'error' ? 'alert-error' : 'alert-success'}>
              {feedbackMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="proposal-form">
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
                      setPricePerEnergy(220.5)
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
                      setPricePerEnergy(210)
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
              <label htmlFor="price">Precio Tope Ofertado ($ por kWh)</label>
              <input
                id="price"
                type="number"
                step="0.1"
                min="1"
                max={PRICE_CAP}
                value={pricePerEnergy}
                onChange={(e) => setPricePerEnergy(e.target.value)}
                required
              />
              <small className="field-note">
                {pricePerEnergy > PRICE_CAP ? (
                  <strong className="text-danger">Supera el tope reglamentario (${PRICE_CAP})</strong>
                ) : (
                  `Dentro del límite regulatorio (≤ $${PRICE_CAP})`
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
          <h2 id="history-title">Propuestas del Ciclo en Curso</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Dirección</th>
                <th>Energía</th>
                <th>Precio Tope</th>
                <th>Estado Final</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.id}>
                  <td><code>{p.id}</code></td>
                  <td>
                    <span className={`direction-badge ${p.direction === 'give' ? 'badge-give' : 'badge-take'}`}>
                      {p.direction.toUpperCase()}
                    </span>
                  </td>
                  <td>{p.quantity.toLocaleString('es-CL')} kWh</td>
                  <td>${p.pricePerEnergy}</td>
                  <td>
                    <span
                      className={`status-pill ${
                        p.status === 'Pagada'
                          ? 'pill-active'
                          : p.status.includes('timeout')
                          ? 'pill-error'
                          : 'pill-warning'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td><small>{p.created}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
