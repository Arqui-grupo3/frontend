import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { dataService } from '../services/dataService'

export function AuditLogView() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [searchId, setSearchId] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Cargar registros de auditoría desde el backend
  useEffect(() => {
    let isMounted = true

    async function fetchLogs() {
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
            console.warn('[AuditLogView] Error obteniendo token:', tokenErr)
          }
        }

        const res = await dataService.getAuditLogs(
          {
            reason: filter === 'ALL' ? null : filter,
            page,
            limit: 25,
          },
          token
        )

        if (isMounted) {
          setLogs(res.data || [])
          setTotalPages(res.totalPages || 1)
          setTotalCount(res.total || 0)
        }
      } catch (err) {
        console.error('[AuditLogView] Error cargando registros de auditoría:', err)
        if (isMounted) {
          setError(err.message || 'Error al conectar con el servicio de auditoría')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchLogs()

    return () => {
      isMounted = false
    }
  }, [filter, page, refreshIndex, isAuthenticated, getAccessToken])

  // Filtrado local por texto/UUID sobre la página actual
  const filteredLogs = logs.filter((item) => {
    if (!searchId.trim()) return true
    const q = searchId.toLowerCase()
    return (
      (item.msgId && item.msgId.toLowerCase().includes(q)) ||
      (item.idpk && item.idpk.toLowerCase().includes(q)) ||
      (item.type && item.type.toLowerCase().includes(q)) ||
      (item.cycleId && item.cycleId.toLowerCase().includes(q)) ||
      (item.detail && item.detail.toLowerCase().includes(q)) ||
      (item.action && item.action.toLowerCase().includes(q))
    )
  })

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    setPage(1)
  }

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleRefresh = () => {
    setRefreshIndex((prev) => prev + 1)
  }

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Seguridad e Integridad</p>
          <h1>Registro de Auditoría</h1>
          <p>
            Monitoreo en tiempo real de anomalías de mensajería, control de idempotencia y validación de contrato AMQP.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="filter-btn"
            onClick={handleRefresh}
            title="Refrescar registros"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>🔄</span> Actualizar
          </button>
          <span className="badge">Auditoría AMQP</span>
        </div>
      </div>

      <div className="info-box">
        <strong>Auditoría de Integridad (RF05):</strong> Registro inmutable en base de datos de mensajes descartados (sin <code>msgId</code> o JSON inválido), violaciones de esquema (NACK) y eventos deduplicados por <code>idpk</code> para garantizar que ninguna operación se ejecute dos veces en el ledger.
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

      {/* Barra de filtros y búsqueda */}
      <div className="audit-controls">
        <div className="filter-bar">
          <span className="filter-label">Filtrar motivo:</span>
          <button
            type="button"
            className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => handleFilterChange('ALL')}
          >
            Todos {filter === 'ALL' && totalCount > 0 ? `(${totalCount})` : ''}
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'DUPLICADO' ? 'active' : ''}`}
            onClick={() => handleFilterChange('DUPLICADO')}
          >
            Duplicados (idpk) {filter === 'DUPLICADO' && totalCount > 0 ? `(${totalCount})` : ''}
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'NACK' ? 'active' : ''}`}
            onClick={() => handleFilterChange('NACK')}
          >
            NACKs Emitidos {filter === 'NACK' && totalCount > 0 ? `(${totalCount})` : ''}
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'DESCARTE' ? 'active' : ''}`}
            onClick={() => handleFilterChange('DESCARTE')}
          >
            Descartes (Sin msgId) {filter === 'DESCARTE' && totalCount > 0 ? `(${totalCount})` : ''}
          </button>
        </div>

        <input
          type="search"
          className="search-input"
          placeholder="Buscar por UUID (msgId, idpk), tipo de mensaje o ciclo en esta página..."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
        />
      </div>

      {/* Tabla de registros de auditoría */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p>Consultando registros de auditoría en la base de datos...</p>
          </div>
        ) : (
          <>
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
                      <td>
                        <code title={log.fullDate}>{log.timestamp}</code>
                      </td>
                      <td>
                        <span className={`category-badge ${log.statusBadge}`}>
                          {log.category}
                        </span>
                      </td>
                      <td>
                        <strong>{log.type}</strong>
                        {log.cycleId && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {log.cycleId}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="id-block">
                          <small>msgId: <code>{log.msgId}</code></small>
                          <small>idpk: <code>{log.idpk}</code></small>
                        </div>
                      </td>
                      <td>
                        <span className="action-pill">{log.action}</span>
                      </td>
                      <td>
                        <div>{log.detail}</div>
                        {log.rawDetails && Object.keys(log.rawDetails).length > 0 && (
                          <div>
                            <button
                              type="button"
                              className="audit-expand-btn"
                              onClick={() => toggleExpand(log.id)}
                            >
                              {expandedId === log.id ? 'Ocultar JSON técnico ▲' : 'Ver detalle técnico JSON ▼'}
                            </button>
                            {expandedId === log.id && (
                              <pre className="audit-details-json">
                                {JSON.stringify(log.rawDetails, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-message">
                      No se encontraron registros de auditoría con los criterios seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Barra de paginación */}
            <div className="audit-pagination">
              <div>
                Total: <strong>{totalCount}</strong> registro{totalCount === 1 ? '' : 's'} en base de datos
              </div>
              <div className="audit-pagination-controls">
                <button
                  type="button"
                  className="audit-pagination-btn"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                >
                  ← Anterior
                </button>
                <span>
                  Página <strong>{page}</strong> de <strong>{Math.max(totalPages, 1)}</strong>
                </span>
                <button
                  type="button"
                  className="audit-pagination-btn"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
