import { useState } from 'react'
import { dataService } from '../services/dataService'

export function AuditLogView() {
  const auditLogs = dataService.getAuditLogs()
  const [filter, setFilter] = useState('ALL')
  const [searchId, setSearchId] = useState('')

  const filteredLogs = auditLogs.filter((item) => {
    const matchesFilter = filter === 'ALL' || item.category === filter
    const matchesSearch =
      searchId.trim() === '' ||
      item.msgId.toLowerCase().includes(searchId.toLowerCase()) ||
      item.idpk.toLowerCase().includes(searchId.toLowerCase()) ||
      item.type.toLowerCase().includes(searchId.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Seguridad e Integridad</p>
          <h1>Registro de Auditoría</h1>
          <p>
            Monitoreo de anomalías de mensajería, control de idempotencia y validación de protocolo.
          </p>
        </div>
        <span className="badge">Auditoría AMQP</span>
      </div>

      <div className="info-box">
        <strong>Auditoría de Integridad:</strong> Registro de mensajes descartados (sin <code>msgId</code>), errores de formato o contrato (NACK) y eventos de deduplicación por <code>idpk</code> para garantizar que ninguna operación se ejecute dos veces en el ledger.
      </div>

      {/* Barra de filtros y búsqueda */}
      <div className="audit-controls">
        <div className="filter-bar">
          <span className="filter-label">Filtrar:</span>
          <button
            type="button"
            className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            Todos ({auditLogs.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'DUPLICADO' ? 'active' : ''}`}
            onClick={() => setFilter('DUPLICADO')}
          >
            Duplicados (idpk)
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'NACK' ? 'active' : ''}`}
            onClick={() => setFilter('NACK')}
          >
            NACKs Emitidos
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'DESCARTE' ? 'active' : ''}`}
            onClick={() => setFilter('DESCARTE')}
          >
            Descartes (Sin msgId)
          </button>
        </div>

        <input
          type="search"
          className="search-input"
          placeholder="Buscar por UUID (msgId, idpk) o tipo de mensaje..."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
        />
      </div>

      {/* Tabla de registros de auditoría */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Categoría</th>
              <th>Tipo Mensaje</th>
              <th>msgId / idpk</th>
              <th>Acción Tomada</th>
              <th>Detalle del Evento</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td><code>{log.timestamp}</code></td>
                  <td>
                    <span className={`category-badge ${log.statusBadge}`}>
                      {log.category}
                    </span>
                  </td>
                  <td><strong>{log.type}</strong></td>
                  <td>
                    <div className="id-block">
                      <small>msgId: <code>{log.msgId}</code></small>
                      <small>idpk: <code>{log.idpk}</code></small>
                    </div>
                  </td>
                  <td>
                    <span className="action-pill">{log.action}</span>
                  </td>
                  <td>{log.detail}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-message">
                  No se encontraron registros con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
