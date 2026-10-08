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
      const energyQty = data.energy ?? data.quantity ?? 0
      const priceVal = data.pricePerEnergy ?? data.price ?? null
      detail = `Confirmación de energía: ${Number(energyQty).toLocaleString('es-CL')} kWh${priceVal !== null ? ` @ $${priceVal} créditos/kWh` : ''}`
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

function normalizeNegotiation(item) {
  const id = item.idpk || item.id || item.lastMsgId || item.msgId || 'prop'
  const cycleId = item.cycleId || item.cycle_id || 'N/A'
  const direction = String(item.direction || item.data?.direction || 'give').toLowerCase()
  const quantity = Number(item.quantity ?? item.data?.quantity ?? item.energyAgreed ?? 0)
  const pricePerEnergy = Number(
    item.pricePerEnergy ?? item.price_per_energy ?? item.data?.pricePerEnergy ?? item.priceAgreed ?? 0
  )

  const rawStatus = String(item.status || 'pending').toLowerCase()
  let statusBadge = 'pill-warning'
  let statusText = 'Pendiente'

  if (rawStatus === 'paid' || rawStatus === 'pagada') {
    statusBadge = 'pill-active'
    statusText = 'Pagada'
  } else if (rawStatus === 'confirmed' || rawStatus === 'confirmada') {
    statusBadge = 'pill-warning'
    statusText = direction === 'take' ? 'Confirmada (Pagando)' : 'Confirmada (Esperando Pago)'
  } else if (rawStatus === 'expired' || rawStatus.includes('timeout')) {
    statusBadge = 'pill-error'
    statusText = 'Expirada por timeout'
  } else if (rawStatus === 'failed' || rawStatus === 'fallida') {
    statusBadge = 'pill-error'
    statusText = item.lastError ? `Fallida (${item.lastError})` : 'Fallida'
  } else {
    statusBadge = 'pill-warning'
    statusText = 'Pendiente (Esperando confirmación)'
  }

  const createdAt = item.createdAt || item.created_at || item.receivedAt || item.received_at
  const createdTime = formatTime(createdAt)
  const createdDate = formatDate(createdAt)

  return {
    id,
    idpk: item.idpk || id,
    cycleId,
    direction,
    quantity,
    pricePerEnergy,
    status: statusText,
    rawStatus,
    statusBadge,
    phase: item.phase || null,
    attempts: item.attempts || 0,
    energyAgreed: item.energyAgreed ? Number(item.energyAgreed) : null,
    priceAgreed: item.priceAgreed ? Number(item.priceAgreed) : null,
    paymentAmount: item.paymentAmount ? Number(item.paymentAmount) : null,
    confirmationMsgId: item.confirmationMsgId || null,
    paymentMsgId: item.paymentMsgId || null,
    lastError: item.lastError || null,
    created: createdTime,
    createdDate,
    rawCreatedAt: createdAt,
  }
}

function normalizeAuditLog(item) {
  const id = item.id || `audit-${Math.random().toString(36).substring(2, 9)}`
  const reason = String(item.reason || 'UNKNOWN').toUpperCase()

  let category = 'OTRO'
  let statusBadge = 'badge-discard'
  let defaultAction = 'REGISTRADO'

  if (reason === 'DUPLICATE_IDPK') {
    category = 'DUPLICADO'
    statusBadge = 'badge-dup'
    defaultAction = 'IGNORADO (IDEMPOTENCIA)'
  } else if (reason === 'NACK') {
    category = 'NACK'
    statusBadge = 'badge-nack'
    const code = item.details?.code || item.details?.nackCode || ''
    const nackReason = item.details?.nackReason || ''
    defaultAction = code || nackReason ? `NACK (${[code, nackReason].filter(Boolean).join(' ')})` : 'NACK'
  } else if (reason === 'DISCARDED') {
    category = 'DESCARTE'
    statusBadge = 'badge-discard'
    defaultAction = 'DESCARTADO SIN RESPUESTA'
  }

  let detail = ''
  if (typeof item.details === 'string') {
    detail = item.details
  } else if (item.details && typeof item.details === 'object') {
    if (item.details.message) {
      detail = item.details.message
      if (item.details.error) detail += ` (${item.details.error})`
    } else if (item.details.routingKey) {
      detail = `Routing key inesperada descartada: ${item.details.routingKey}`
    } else if (item.details.nackReason) {
      detail = `${item.details.nackReason}: ${item.details.message || 'Contrato violado'}`
    } else if (item.details.originalEventId) {
      detail = `Operación con idpk ya registrada previamente (evento ${item.details.originalEventId.slice(0, 8)}...). Deduplicado.`
    } else if (Object.keys(item.details).length > 0) {
      try {
        detail = JSON.stringify(item.details)
      } catch {
        detail = 'Detalles adicionales registrados.'
      }
    }
  }

  if (!detail) {
    if (reason === 'DUPLICATE_IDPK') detail = 'Mensaje con idpk ya registrado en el ledger. Previene cobro doble o desbalance.'
    else if (reason === 'DISCARDED') detail = 'Mensaje descartado por falta de msgId o formato corrupto.'
    else if (reason === 'NACK') detail = 'Mensaje rechazado por violación de contrato o validación.'
    else detail = 'Registro de auditoría del sistema.'
  }

  const timestamp = formatTime(item.receivedAt || item.received_at)
  const fullDate = formatDate(item.receivedAt || item.received_at)

  return {
    id,
    timestamp,
    fullDate,
    category,
    rawReason: reason,
    type: item.type || 'unknown',
    idpk: item.idpk || 'n/a',
    msgId: item.msgId || item.msg_id || 'AUSENTE',
    cycleId: item.cycleId || item.cycle_id || null,
    action: defaultAction,
    detail,
    statusBadge,
    rawDetails: item.details,
    rawReceivedAt: item.receivedAt || item.received_at,
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

  getNegotiations: async (cycleId, token) => {
    const query = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}&limit=50` : '?limit=50'
    const res = await apiRequest(`/negotiations${query}`, token)
    const list = Array.isArray(res) ? res : (res?.data || [])
    return list.map(normalizeNegotiation)
  },

  getProposals: async (token) => {
    const res = await apiRequest('/negotiations?limit=50', token)
    const list = Array.isArray(res) ? res : (res?.data || [])
    return list.map(normalizeNegotiation)
  },

  createProposal: async (proposalData, token) => {
    return await apiRequest('/negotiations', token, {
      method: 'POST',
      body: JSON.stringify({
        cycleId: proposalData.cycleId,
        direction: proposalData.direction,
        quantity: Number(proposalData.quantity),
        pricePerEnergy: Number(proposalData.pricePerEnergy),
      }),
    })
  },

  getAuditLogs: async (filters = {}, token) => {
    let reasonParam = null
    const rawFilter = String(filters.reason || filters.category || '').toUpperCase()
    if (rawFilter === 'DUPLICADO' || rawFilter === 'DUPLICATE_IDPK') {
      reasonParam = 'DUPLICATE_IDPK'
    } else if (rawFilter === 'NACK') {
      reasonParam = 'NACK'
    } else if (rawFilter === 'DESCARTE' || rawFilter === 'DISCARDED') {
      reasonParam = 'DISCARDED'
    }

    const page = Math.max(parseInt(filters.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 25, 1), 100)

    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (reasonParam) {
      params.set('reason', reasonParam)
    }

    const res = await apiRequest(`/audit?${params.toString()}`, token)
    const rows = Array.isArray(res?.data) ? res.data : []
    return {
      page: res.page || page,
      limit: res.limit || limit,
      total: res.total ?? rows.length,
      totalPages: res.totalPages ?? (rows.length ? 1 : 0),
      data: rows.map(normalizeAuditLog),
    }
  },
}



