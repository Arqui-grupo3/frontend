/**
 * dataService.js
 * Capa de servicio de datos para el nodo EnergyShark (Ciudad REE).
 * Provee datos y mutaciones locales desacopladas, preparadas para conectar
 * la API REST definitiva de P4 (API Gateway) sin alterar los componentes.
 */

const KNOWN_CITY_NAMES = {
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
  REE: 'EnergyShark (REE)',
}

const INITIAL_PROPOSALS = [
  {
    id: 'prop-8821',
    direction: 'give',
    quantity: 2024,
    pricePerEnergy: 220.5,
    status: 'Pagada',
    created: '13:52:10',
    confirmedAt: '13:52:25',
    paidAt: '13:52:38',
    cycleId: 'cycle-9431',
  },
  {
    id: 'prop-8819',
    direction: 'take',
    quantity: 500,
    pricePerEnergy: 210,
    status: 'Expirada por timeout',
    created: '13:45:00',
    confirmedAt: null,
    paidAt: null,
    cycleId: 'cycle-9431',
  },
]

const INITIAL_AUDIT_LOGS = [
  {
    id: 'evt-101',
    timestamp: '13:54:12',
    category: 'DUPLICADO',
    type: 'transfer',
    idpk: 'e7b8c8d2-4311-41bb-9cb1-e8d11122a001',
    msgId: 'a32f0190-b141-4771-bf12-441299900001',
    action: 'IGNORADO',
    detail: 'Mensaje con idpk ya registrado en el ledger. Previene cobro doble o desbalance.',
    statusBadge: 'badge-dup',
  },
  {
    id: 'evt-102',
    timestamp: '13:51:05',
    category: 'NACK',
    type: 'invalid-command',
    idpk: 'c1299381-44bb-4911-8899-019992224411',
    msgId: 'd4811099-0012-4781-a991-881233441122',
    action: 'NACK (400 UNKNOWN_TYPE)',
    detail: 'UNKNOWN_TYPE: Tipo de mensaje no reconocido por la especificación de la central.',
    statusBadge: 'badge-nack',
  },
  {
    id: 'evt-103',
    timestamp: '13:48:22',
    category: 'DESCARTE',
    type: 'malformed_raw',
    idpk: 'n/a',
    msgId: 'AUSENTE',
    action: 'DESCARTADO SIN RESPUESTA',
    detail: 'Mensaje sin msgId o JSON corrupto. No existe remitente válido a quien responder NACK.',
    statusBadge: 'badge-discard',
  },
  {
    id: 'evt-104',
    timestamp: '13:42:18',
    category: 'NACK',
    type: 'negotiation-proposal',
    idpk: 'f8821901-aaaa-bbbb-cccc-112233445566',
    msgId: 'f8821901-aaaa-bbbb-cccc-112233445566',
    action: 'NACK (422 IDPK_EQUALS_MSGID)',
    detail: 'IDPK_EQUALS_MSGID: La llave de idempotencia (idpk) no puede ser idéntica al msgId.',
    statusBadge: 'badge-nack',
  },
]

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || (
  typeof window !== 'undefined' && window.location.hostname.includes('fasantamaria.me')
    ? 'https://api.fasantamaria.me'
    : 'http://localhost:3000'
)

async function apiRequest(path, token, options = {}) {
  const url = `${API_BASE_URL}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const err = new Error(errorBody.error || errorBody.message || `Error HTTP ${response.status}`)
    err.status = response.status
    throw err
  }
  return response.json()
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

function formatDate(isoStr) {
  if (!isoStr) return 'Fecha desconocida'
  try {
    const d = new Date(isoStr)
    return isNaN(d.getTime()) ? isoStr : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return isoStr
  }
}

function mapEventToOperation(ev, isLast) {
  const time = formatTime(ev.receivedAt)
  const data = ev.data || {}

  let name = ev.type
  let detail = ''

  switch (ev.type) {
    case 'status-statement': {
      name = 'Capacidad y Consumo Recibido'
      const en = data.energy || data
      detail = `Capacidad: ${(en.generationCapacity || 0).toLocaleString('es-CL')} kWh · Consumo: ${(en.consumption || 0).toLocaleString('es-CL')} kWh · Costo base: $${en.generationCost ?? 0} créditos`
      break
    }
    case 'transfer': {
      name = 'Transferencia de Fondos'
      const qty = data.quantity ?? data.amount ?? 0
      detail = `Transferencia recibida: +${qty.toLocaleString('es-CL')} créditos${data.becauseOf ? ` · Ref: ${data.becauseOf}` : ''}`
      break
    }
    case 'demand-statement': {
      name = 'Bolsa de Energía de la Central'
      const bal = data.balance || data
      detail = `Orden central: ${(bal.quantity || 0).toLocaleString('es-CL')} kWh @ $${bal.valuePerKwh ?? 0} créditos/kWh`
      break
    }
    case 'negotiation-proposal': {
      name = `Propuesta Voluntaria (${data.direction || 'give'})`
      detail = `Oferta emitida: ${(data.quantity || 0).toLocaleString('es-CL')} kWh @ $${data.pricePerEnergy ?? 0} créditos`
      break
    }
    case 'give':
    case 'take': {
      name = `Confirmación Central (${ev.type})`
      detail = `Confirmación de energía: ${(data.quantity || 0).toLocaleString('es-CL')} kWh`
      break
    }
    case 'negotiation-report': {
      name = 'Reporte de Cierre Emitido'
      detail = `Reporte en ventana de cierre. Presupuesto: ${(data.budgetBalance || 0).toLocaleString('es-CL')} créditos · Balance energía: ${(data.energyBalance || 0).toLocaleString('es-CL')} kWh`
      break
    }
    default: {
      name = `Operación: ${ev.type}`
      detail = `Procesada en el ledger (idpk: ${ev.idpk || 'n/a'})`
    }
  }

  return {
    time,
    type: ev.type,
    name,
    detail,
    isLast: !!isLast || ev.lastOperation === true,
  }
}

function normalizeCycle(c) {
  const firstStatus = c.statusStatements?.[0] || {}
  const statusEnergy = firstStatus.energy || firstStatus
  const firstTransfer = c.transfers?.[0] || {}
  const finalBal = c.finalBalances || {}

  let status = 'En curso'
  if (c.lastOperationType === 'negotiation-report') {
    status = 'Reporte Enviado (Cerrado)'
  } else if (c.lastOperationType) {
    status = `Última op: ${c.lastOperationType}`
  }

  const operations = []

  ;(c.statusStatements || []).forEach((st) => {
    const en = st.energy || st
    operations.push({
      time: formatTime(st.validUntil || c.startedAt),
      type: 'status-statement',
      name: 'Capacidad y Consumo Recibido',
      detail: `Capacidad: ${(en.generationCapacity || 0).toLocaleString('es-CL')} kWh · Consumo: ${(en.consumption || 0).toLocaleString('es-CL')} kWh · Costo base: $${en.generationCost ?? 0} créditos`,
    })
  })

  ;(c.transfers || []).forEach((tr) => {
    operations.push({
      time: formatTime(c.startedAt),
      type: 'transfer',
      name: 'Fondos Iniciales Transferidos',
      detail: `Transferencia recibida: +${(tr.quantity || tr.funds || 0).toLocaleString('es-CL')} créditos${tr.becauseOf ? ` · Ref: ${tr.becauseOf}` : ''}`,
    })
  })

  ;(c.demandStatements || []).forEach((dm) => {
    const bal = dm.balance || dm
    operations.push({
      time: formatTime(c.lastOperationAt),
      type: 'demand-statement',
      name: 'Bolsa de Energía Central',
      detail: `Orden central: ${(bal.quantity || 0).toLocaleString('es-CL')} kWh @ $${bal.valuePerKwh ?? 0} créditos/kWh`,
    })
  })

  ;(c.negotiations || []).forEach((ng) => {
    operations.push({
      time: formatTime(c.lastOperationAt),
      type: 'negotiation-proposal',
      name: `Propuesta de Negociación (${ng.direction || 'voluntaria'})`,
      detail: `Cantidad: ${(ng.quantity || 0).toLocaleString('es-CL')} kWh @ $${ng.pricePerEnergy ?? 0} créditos`,
    })
  })

  ;(c.negotiationReports || []).forEach((nr) => {
    operations.push({
      time: formatTime(c.lastOperationAt),
      type: 'negotiation-report',
      name: 'Reporte de Cierre Emitido',
      detail: `Reporte en ventana de cierre. Presupuesto final: ${(nr.budgetBalance || 0).toLocaleString('es-CL')} créditos · Balance: ${(nr.energyBalance || 0).toLocaleString('es-CL')} kWh`,
    })
  })

  if (operations.length === 0 && c.lastOperationType) {
    operations.push({
      time: formatTime(c.lastOperationAt),
      type: c.lastOperationType,
      name: `Operación: ${c.lastOperationType}`,
      detail: `Última operación registrada a las ${formatTime(c.lastOperationAt)} (${c.operationCount || 1} operaciones en total).`,
    })
  }

  return {
    id: c.cycleId || 'Ciclo',
    cycleId: c.cycleId,
    period: `${formatTime(c.startedAt)} – ${formatTime(c.lastOperationAt)}`,
    date: formatDate(c.startedAt || c.lastOperationAt),
    status,
    budgetBalance: finalBal.budgetBalance ?? firstTransfer.quantity ?? 0,
    energyBalance: finalBal.energyBalance ?? 0,
    generationCapacity: statusEnergy.generationCapacity ?? 0,
    consumption: statusEnergy.consumption ?? 0,
    generationCost: statusEnergy.generationCost ?? 0,
    funds: firstTransfer.quantity ?? 0,
    operationCount: c.operationCount || operations.length,
    lastOperationType: c.lastOperationType,
    lastOperationAt: c.lastOperationAt,
    operations,
  }
}

function normalizeConnectivity(res) {
  if (!res) {
    return {
      id: null,
      cycleId: null,
      receivedAt: null,
      distances: [],
    }
  }

  const rawDistances = res.data?.distances || res.data || {}
  const distances = []

  if (Array.isArray(rawDistances)) {
    rawDistances.forEach((item) => {
      const code = String(item.code || item.destination || item.cityId || '').toUpperCase()
      if (!code) return
      distances.push({
        code,
        name: item.name || KNOWN_CITY_NAMES[code] || code,
        distance: Number(item.distance) || 0,
        transportCost: Number(item.transportCost) || 0,
        enabled: Boolean(item.enabled),
      })
    })
  } else if (rawDistances && typeof rawDistances === 'object') {
    Object.entries(rawDistances).forEach(([key, val]) => {
      if (val && typeof val === 'object') {
        const code = key.toUpperCase()
        distances.push({
          code,
          name: val.name || KNOWN_CITY_NAMES[code] || code,
          distance: Number(val.distance) || 0,
          transportCost: Number(val.transportCost) || 0,
          enabled: Boolean(val.enabled),
        })
      }
    })
  }

  distances.sort((a, b) => a.code.localeCompare(b.code))

  return {
    id: res.id || null,
    cycleId: res.cycleId || null,
    receivedAt: res.receivedAt || null,
    distances,
  }
}

export const dataService = {
  getCycles: async (token) => {
    const res = await apiRequest('/cycles?limit=50', token)
    const list = Array.isArray(res) ? res : (res?.data || [])
    return list.map(normalizeCycle)
  },

  getCycleOperations: async (cycleId, token) => {
    if (!cycleId) return []
    const res = await apiRequest(`/history?cycleId=${encodeURIComponent(cycleId)}&limit=100`, token)
    const events = Array.isArray(res) ? res : (res?.data || [])
    return events.map((ev, idx) => mapEventToOperation(ev, idx === events.length - 1))
  },

  getConnectivity: async (token) => {
    const res = await apiRequest('/connectivity', token)
    return normalizeConnectivity(res)
  },

  getProposals: () => [...INITIAL_PROPOSALS],
  getAuditLogs: () => [...INITIAL_AUDIT_LOGS],
}

