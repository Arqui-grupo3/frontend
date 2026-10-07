/**
 * dataService.js
 * Capa de servicio de datos para el nodo EnergyShark (Ciudad REE).
 * Provee datos y mutaciones locales desacopladas, preparadas para conectar
 * la API REST definitiva de P4 (API Gateway) sin alterar los componentes.
 */

const INITIAL_CYCLES = [
  {
    id: 'cycle-9431',
    period: '14:00 – 16:00',
    date: '6 oct 2026',
    status: 'Reporte Enviado',
    generationCapacity: 1234512,
    consumption: 1444121,
    generationCost: 210,
    funds: 508145,
    budgetBalance: 476645,
    energyBalance: 450,
    operations: [
      {
        time: '13:40:02',
        type: 'status-statement',
        name: 'Capacidad y Consumo Recibido',
        detail: 'Capacidad 1.234.512 kWh · Consumo proyectado 1.444.121 kWh · Costo base 210 créditos',
      },
      {
        time: '13:40:15',
        type: 'transfer',
        name: 'Fondos Iniciales Transferidos',
        detail: 'Transferencia inicial de la central recibida: +508.145 créditos',
      },
      {
        time: '13:47:30',
        type: 'demand-statement',
        name: 'Bolsa de Energía de la Central',
        detail: 'Orden central aplicada: +1.500 kWh · Deducción de presupuesto (1.500 × 215 = -322.500 créditos)',
      },
      {
        time: '13:52:10',
        type: 'negotiation-proposal',
        name: 'Propuesta Voluntaria Emitida (Give)',
        detail: 'Venta a la central ofertada: 2.024 kWh @ 220.5 créditos (tope con 5% premium)',
      },
      {
        time: '13:52:25',
        type: 'give-confirmation',
        name: 'Confirmación y Pago de Negociación',
        detail: 'Confirmado por la central en 15s (≤30s) y transfer emitido a tiempo (+446.292 créditos)',
      },
      {
        time: '13:55:01',
        type: 'negotiation-report',
        name: 'Reporte de Cierre Emitido',
        detail: 'negotiation-report enviado en ventana de cierre. Presupuesto final: 476.645 · Balance energía: 450 kWh',
      },
    ],
  },
  {
    id: 'cycle-9430',
    period: '12:00 – 14:00',
    date: '6 oct 2026',
    status: 'Cerrado',
    generationCapacity: 1100000,
    consumption: 1250000,
    generationCost: 205,
    funds: 450000,
    budgetBalance: 412000,
    energyBalance: 380,
    operations: [
      {
        time: '11:40:00',
        type: 'status-statement',
        name: 'Capacidad y Consumo Recibido',
        detail: 'Capacidad 1.100.000 kWh · Consumo proyectado 1.250.000 kWh',
      },
      {
        time: '11:40:10',
        type: 'transfer',
        name: 'Fondos Iniciales Transferidos',
        detail: 'Transferencia inicial recibida: +450.000 créditos',
      },
      {
        time: '11:55:05',
        type: 'negotiation-report',
        name: 'Reporte de Cierre Emitido',
        detail: 'Reporte enviado dentro del periodo de cierre con éxito.',
      },
    ],
  },
]

const INITIAL_DISTANCES = [
  { code: 'HGW', name: 'Hogwarts', distance: 62763183, transportCost: 0.0034, enabled: true },
  { code: 'COR', name: 'Coruscant', distance: 81240900, transportCost: 0.0028, enabled: true },
  { code: 'RAP', name: 'Rapture', distance: 45910300, transportCost: 0.0041, enabled: false },
  { code: 'TAL', name: 'Talca', distance: 250000, transportCost: 0.0012, enabled: true },
  { code: 'LSN', name: 'Los Santos', distance: 54120300, transportCost: 0.0032, enabled: true },
  { code: 'MTI', name: 'Minas Tirith', distance: 78900400, transportCost: 0.0039, enabled: true },
  { code: 'SPR', name: 'Springfield', distance: 34100200, transportCost: 0.0022, enabled: true },
  { code: 'NNY', name: 'New New York', distance: 89120400, transportCost: 0.0035, enabled: false },
  { code: 'KLD', name: "King's Landing", distance: 67100500, transportCost: 0.0030, enabled: true },
  { code: 'TAR', name: 'Tar Valon', distance: 94306517, transportCost: 0.0013, enabled: true },
  { code: 'TK3', name: 'Tokyo-3', distance: 112000400, transportCost: 0.0045, enabled: true },
]

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

export const dataService = {
  getCycles: () => [...INITIAL_CYCLES],
  getConnectivity: () => [...INITIAL_DISTANCES],
  getProposals: () => [...INITIAL_PROPOSALS],
  getAuditLogs: () => [...INITIAL_AUDIT_LOGS],
}
