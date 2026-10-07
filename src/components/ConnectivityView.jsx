import { useState } from 'react'
import { dataService } from '../services/dataService'

const formatMeters = new Intl.NumberFormat('es-CL').format

export function ConnectivityView() {
  const distances = dataService.getConnectivity()
  const [searchTerm, setSearchTerm] = useState('')
  const [onlyEnabled, setOnlyEnabled] = useState(false)

  const filteredDistances = distances.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = !onlyEnabled || item.enabled
    return matchesSearch && matchesFilter
  })

  return (
    <div className="view-container">
      <div className="heading">
        <div>
          <p className="eyebrow">Red de Transmisión</p>
          <h1>Conectividad de Ciudades</h1>
          <p>
            Tabla de distancias y costos de transporte interurbano (<code>distance-table</code>).
          </p>
        </div>
        <span className="badge">Red Activa</span>
      </div>

      <div className="info-box">
        <strong>Topología de Red:</strong> Matriz de distancias vigentes y costos calculados dinámicamente según pérdidas de línea en créditos / (kWh × km).
      </div>

      {/* Controles de filtro y búsqueda */}
      <div className="connectivity-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar ciudad o sigla (ej. Hogwarts, COR)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={onlyEnabled}
            onChange={(e) => setOnlyEnabled(e.target.checked)}
          />
          <span>Mostrar solo rutas habilitadas</span>
        </label>
      </div>

      {/* Tabla de distancias */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sigla</th>
              <th>Ciudad Destino</th>
              <th>Distancia (km)</th>
              <th>Distancia exacta (m)</th>
              <th>Costo de Transporte</th>
              <th>Estado de Ruta</th>
            </tr>
          </thead>
          <tbody>
            {filteredDistances.length > 0 ? (
              filteredDistances.map((city) => (
                <tr key={city.code}>
                  <td><strong>{city.code}</strong></td>
                  <td>{city.name}</td>
                  <td>{formatMeters(Math.round(city.distance / 1000))} km</td>
                  <td><code>{formatMeters(city.distance)} m</code></td>
                  <td>{city.transportCost} créditos / (kWh·km)</td>
                  <td>
                    <span className={`status-pill ${city.enabled ? 'pill-active' : 'pill-disabled'}`}>
                      {city.enabled ? 'Habilitada' : 'Deshabilitada'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-message">
                  No se encontraron rutas con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
