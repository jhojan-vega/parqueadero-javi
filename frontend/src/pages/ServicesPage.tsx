import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { formatTurno } from '../utils/formatTurno'
import { calcularSalida, obtenerCajasAbiertas, obtenerDisponibilidad, obtenerServiciosActivos, registrarEntrada, registrarSalida } from '../api/servicios.api'
import { ApiError } from '../api/http'
import { Plate } from '../components/Plate'
import { ReceiptCode } from '../components/ReceiptCode'
import { normalizeReceiptCode } from '../utils/receiptCode'
import { VehicleTypeIndicator } from '../components/VehicleTypeIndicator'
import { formatDuration } from '../utils/formatDuration'
import type { CalculoSalida, DisponibilidadServicios, MedioPago, ReciboSalida, ServicioActivo, TipoVehiculo } from '../modules/servicios/servicio.types'
import { textoServicio } from '../modules/servicios/servicio.types'

interface ServicesPageProps { token: string; collaboratorId: string; initialAction: 'entry' | 'exit' | null; onActionConsumed: () => void; onDataChanged: () => void }
type Dialog = 'entry' | 'entry-confirm' | 'entry-receipt' | 'exit' | 'payment' | 'final-receipt' | null
const types: Array<'Todos' | TipoVehiculo> = ['Todos', 'Carro', 'Moto', 'Bicicleta']
const formatDate = (value: string): string => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const formatMoney = (value: number): string => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
const errorText = (error: unknown): string => error instanceof ApiError ? error.message : 'No fue posible completar la operación.'
const elapsed = (date: string): string => { const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000)); return `${Math.floor(minutes / 60)} h ${minutes % 60} min` }
const normalizePlate = (value: string): string => value.trim().replace(/\s+/g, '').toUpperCase()

export function ServicesPage({ token, collaboratorId, initialAction, onActionConsumed, onDataChanged }: ServicesPageProps) {
  const [services, setServices] = useState<ServicioActivo[]>([])
  const [availability, setAvailability] = useState<DisponibilidadServicios | null>(null)
  const [boxes, setBoxes] = useState<Array<{ id_caja: string; turno: string; id_colaborador: string }>>([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'Todos' | TipoVehiculo>('Todos')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [vehicleType, setVehicleType] = useState<TipoVehiculo>('Carro')
  const [plate, setPlate] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [special, setSpecial] = useState(false)
  const [calculation, setCalculation] = useState<CalculoSalida | null>(null)
  const [entryReceipt, setEntryReceipt] = useState<ServicioActivo | null>(null)
  const [exitReceipt, setExitReceipt] = useState<ReciboSalida | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<MedioPago>('Efectivo')
  const [reference, setReference] = useState('')
  const [selectedBox, setSelectedBox] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [active, currentAvailability, openBoxes] = await Promise.all([obtenerServiciosActivos(token), obtenerDisponibilidad(token), obtenerCajasAbiertas(token)])
      setServices(active); setAvailability(currentAvailability); setBoxes(openBoxes)
    } catch (requestError) { setError(errorText(requestError)) } finally { setLoading(false) }
  }, [token])

  useEffect(() => { const timer = window.setTimeout(() => { void refresh() }, 0); return () => window.clearTimeout(timer) }, [refresh])
  useEffect(() => { if (!initialAction) return; const timer = window.setTimeout(() => { setDialog(initialAction === 'entry' ? 'entry' : null); onActionConsumed() }, 0); return () => window.clearTimeout(timer) }, [initialAction, onActionConsumed])

  const visibleServices = useMemo(() => services.filter((service) => {
    const normalized = normalizePlate(query)
    const normalizedReceipt = normalizeReceiptCode(query)
    const matches = !normalized || [normalizePlate(service.placa ?? ''), service.identificacion_usuario].some((value) => value?.toUpperCase().includes(normalized)) || normalizeReceiptCode(service.codigo_recibo).includes(normalizedReceipt)
    return matches && (typeFilter === 'Todos' || service.tipo_vehiculo === typeFilter)
  }), [query, services, typeFilter])
  const ownBoxes = boxes.filter((box) => box.id_colaborador === collaboratorId)
  const close = (): void => { setDialog(null); setError(''); setCalculation(null); setReference(''); setPaymentMethod('Efectivo') }
  const cancelEntry = (): void => { setDialog(null); setError(''); setVehicleType('Carro'); setPlate(''); setIdentifier(''); setSpecial(false) }
  const openEntry = (): void => { setVehicleType('Carro'); setPlate(''); setIdentifier(''); setSpecial(false); setError(''); setDialog('entry') }
  const canEnter = availability ? availability[vehicleType].disponibles > 0 : false

  const validateEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    if (vehicleType === 'Bicicleta') { if (!identifier.trim()) { setError('Ingrese la identificación del usuario.'); return } } else { const normalized = normalizePlate(plate); const valid = special || (vehicleType === 'Carro' ? /^[A-Z]{3}\d{3}$/.test(normalized) : /^[A-Z]{3}\d{2}[A-Z]$/.test(normalized)); if (!valid) { setError(vehicleType === 'Carro' ? 'Use el formato ABC123.' : 'Use el formato ABC12D.'); return } }
    if (!canEnter) { setError('SIN CUPOS DISPONIBLES para este tipo de vehículo.'); return }
    setDialog('entry-confirm')
  }

  const confirmEntry = async (): Promise<void> => {
    setSaving(true); setError('')
    try {
      const entry = await registrarEntrada(token, vehicleType === 'Bicicleta' ? { tipo_vehiculo: vehicleType, identificacion_usuario: identifier.trim() } : { tipo_vehiculo: vehicleType, placa: normalizePlate(plate), vehiculo_especial: special })
      setEntryReceipt(entry); setDialog('entry-receipt'); await refresh(); onDataChanged()
    } catch (entryError) { setError(errorText(entryError)); setDialog('entry') } finally { setSaving(false) }
  }

  const calculateExit = async (serviceId: string): Promise<void> => {
    setSaving(true); setError('')
    try {
      const [nextCalculation, openBoxes] = await Promise.all([calcularSalida(token, serviceId), obtenerCajasAbiertas(token)])
      setCalculation(nextCalculation)
      setBoxes(openBoxes)
      const ownBox = openBoxes.filter((box) => box.id_colaborador === collaboratorId)
      setSelectedBox(ownBox.length === 1 ? ownBox[0].id_caja : '')
      setDialog('payment')
    } catch (calculationError) { setError(errorText(calculationError)); setDialog('exit') } finally { setSaving(false) }
  }

  const confirmExit = async (): Promise<void> => {
    if (!calculation) return
    if (!selectedBox) { setError('DEBE ABRIR SU CAJA ANTES DE REGISTRAR EL COBRO.'); return }
    setSaving(true); setError('')
    try { const receipt = await registrarSalida(token, calculation.id_servicio, selectedBox, paymentMethod, reference.trim()); setExitReceipt(receipt); setDialog('final-receipt'); await refresh(); onDataChanged() } catch (exitError) { const message = errorText(exitError); setError(message.includes('caja') ? 'DEBE ABRIR SU CAJA ANTES DE REGISTRAR EL COBRO.' : message) } finally { setSaving(false) }
  }

  const printReceipt = (): void => window.print()
  const value = vehicleType === 'Bicicleta' ? identifier : normalizePlate(plate)

  return <section className="services-page"><header className="module-page-header"><div><span className="eyebrow">OPERACIÓN</span><h2>Servicios</h2><p>Servicios activos y operación de ingreso o salida.</p></div><button className="primary-module-button" type="button" onClick={openEntry}>+ Registrar ingreso</button></header>{error && !dialog && <p className="module-message error" role="alert">{error}</p>}<section className="services-toolbar"><input placeholder="Buscar placa, recibo o identificación" value={query} onChange={(event) => setQuery(event.target.value)} />{types.map((type) => <button key={type} type="button" className={typeFilter === type ? 'active' : ''} onClick={() => setTypeFilter(type)}>{type === 'Todos' ? 'Todos' : `${type}s`}</button>)}</section><div className="services-table-wrap"><table className="services-table"><thead><tr><th>Recibo</th><th>Placa / ID</th><th>Tipo</th><th>Entrada</th><th>Tiempo actual</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{loading ? <tr><td colSpan={7}>Cargando servicios…</td></tr> : visibleServices.length === 0 ? <tr><td colSpan={7}>No hay servicios activos para mostrar.</td></tr> : visibleServices.map((service) => <tr key={service.id_servicio}><td><ReceiptCode value={service.codigo_recibo} /></td><td>{service.placa ? <Plate value={service.placa} /> : <span className="identifier">{service.identificacion_usuario}</span>}</td><td><VehicleTypeIndicator type={service.tipo_vehiculo} compact /></td><td>{formatDate(service.fecha_hora_entrada)}</td><td>{elapsed(service.fecha_hora_entrada)}</td><td><span className="state-pill activo">Activo</span></td><td><div className="table-actions"><button type="button" onClick={() => { setCalculation({ id_servicio: service.id_servicio, codigo_recibo: service.codigo_recibo, placa: service.placa, identificacion_usuario: service.identificacion_usuario, tipo_vehiculo: service.tipo_vehiculo, fecha_hora_entrada: service.fecha_hora_entrada, fecha_hora_salida_calculada: '', tiempo_total_minutos: 0, valor_calculado: 0, id_tarifa: '' }); setDialog('exit') }}>Ver</button><button type="button" disabled={saving} onClick={() => void calculateExit(service.id_servicio)}>Registrar salida</button></div></td></tr>)}</tbody></table></div>{dialog && <div className="dialog-backdrop" role="presentation"><section className="service-dialog" role="dialog" aria-modal="true"><button className="dialog-close" type="button" onClick={dialog === 'entry' || dialog === 'entry-confirm' ? cancelEntry : close}>×</button>{dialog === 'entry' && <form onSubmit={validateEntry}><span className="eyebrow">REGISTRAR INGRESO</span><h2>Nuevo servicio</h2><div className="vehicle-selector">{(['Carro', 'Moto', 'Bicicleta'] as TipoVehiculo[]).map((type) => <button key={type} type="button" className={vehicleType === type ? 'selected' : ''} onClick={() => { setVehicleType(type); setError('') }}>{type}</button>)}</div><p className={canEnter ? 'availability-note' : 'availability-note full'}>{availability ? `${availability[vehicleType].disponibles} cupos disponibles de ${availability[vehicleType].capacidad}` : 'Consultando disponibilidad…'}</p>{vehicleType === 'Bicicleta' ? <label>Identificación / documento / teléfono<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} /></label> : <><label>Placa<input value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} /></label><label className="special-check"><input type="checkbox" checked={special} onChange={(event) => setSpecial(event.target.checked)} /> Vehículo especial o extranjero</label></>}{error && <p className="module-message error">{error}</p>}<button className="primary-module-button" type="submit" disabled={!canEnter}>Continuar</button></form>}{dialog === 'entry-confirm' && <><span className="eyebrow">CONFIRMACIÓN DE INGRESO</span><h2>Verifique los datos</h2><dl className="service-summary"><div><dt>Tipo</dt><dd><VehicleTypeIndicator type={vehicleType} /></dd></div><div><dt>{vehicleType === 'Bicicleta' ? 'Identificación' : 'Placa'}</dt><dd>{vehicleType === 'Bicicleta' ? value : <Plate value={value} />}</dd></div><div><dt>Disponibilidad</dt><dd>{availability?.[vehicleType].disponibles} cupos libres</dd></div></dl>{error && <p className="module-message error">{error}</p>}<div className="entry-confirm-actions"><button className="text-action" type="button" disabled={saving} onClick={() => { setError(''); setDialog('entry') }}>Corregir datos</button><button className="primary-module-button" type="button" disabled={saving} onClick={() => void confirmEntry()}>{saving ? 'Registrando…' : 'Confirmar ingreso'}</button></div></>}{dialog === 'entry-receipt' && entryReceipt && <Receipt title="Ingreso registrado" code={entryReceipt.codigo_recibo} value={textoServicio(entryReceipt)} type={entryReceipt.tipo_vehiculo} date={entryReceipt.fecha_hora_entrada} onPrint={printReceipt} onClose={close} />}{dialog === 'exit' && calculation && <><span className="eyebrow">REGISTRAR SALIDA</span><h2><ReceiptCode value={calculation.codigo_recibo} /></h2><p>Seleccione el servicio para consultar el valor de salida.</p><button className="primary-module-button" type="button" disabled={saving} onClick={() => void calculateExit(calculation.id_servicio)}>{saving ? 'Consultando…' : 'Consultar valor a pagar'}</button></>}{dialog === 'payment' && calculation && <><span className="eyebrow">REVISIÓN ANTES DEL COBRO</span><h2>Valor a pagar</h2><div className="payment-vehicle-type"><VehicleTypeIndicator type={calculation.tipo_vehiculo} /></div><section className="payment-priority"><div className="payment-priority-plate"><span>Placa / ID</span><strong>{calculation.placa ? <Plate value={calculation.placa} /> : calculation.identificacion_usuario}</strong></div><div className="payment-priority-total"><span>Valor a pagar</span><strong>{formatMoney(calculation.valor_calculado)}</strong></div><div className="payment-priority-receipt"><span>Recibo</span><ReceiptCode value={calculation.codigo_recibo} /></div></section><dl className="service-summary"><div><dt>Entrada</dt><dd>{formatDate(calculation.fecha_hora_entrada)}</dd></div><div><dt>Salida calculada</dt><dd>{formatDate(calculation.fecha_hora_salida_calculada)}</dd></div><div className="time-total"><dt>Tiempo total</dt><dd>{formatDuration(calculation.tiempo_total_minutos)}</dd></div></dl>{ownBoxes.length === 0 ? <p className="module-message error">DEBE ABRIR SU CAJA ANTES DE REGISTRAR EL COBRO.</p> : <><label>Caja abierta<select value={selectedBox} onChange={(event) => setSelectedBox(event.target.value)}><option value="">Seleccione su caja</option>{ownBoxes.map((box) => <option key={box.id_caja} value={box.id_caja}>Caja #{box.id_caja} · {formatTurno(box.turno)}</option>)}</select></label><label>Medio de pago<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as MedioPago)}><option value="Efectivo">Efectivo</option><option value="Nequi">Nequi</option></select></label>{paymentMethod === 'Nequi' && <label>Referencia Nequi <small>Opcional</small><input value={reference} maxLength={100} onChange={(event) => setReference(event.target.value)} /></label>}</>}{error && <p className="module-message error">{error}</p>}<div className="payment-actions"><button className="text-action" type="button" disabled={saving} onClick={close}>Cancelar</button><button className="primary-module-button" type="button" disabled={saving || ownBoxes.length === 0} onClick={() => void confirmExit()}>{saving ? 'Confirmando…' : 'Confirmar pago y salida'}</button></div></>}{dialog === 'final-receipt' && exitReceipt && <Receipt title="Pago y salida registrados" code={exitReceipt.codigo_recibo} value={textoServicio(exitReceipt)} type={exitReceipt.tipo_vehiculo} date={exitReceipt.fecha_hora_salida} entryDate={exitReceipt.fecha_hora_entrada} total={exitReceipt.valor_pagado} timeTotal={exitReceipt.tiempo_total} paymentMethod={exitReceipt.medio_pago} cashBox={exitReceipt.id_caja} turno={exitReceipt.turno} onPrint={printReceipt} onClose={close} />}</section></div>}</section>
}

function Receipt({ title, code, value, type, date, entryDate, total, timeTotal, paymentMethod, cashBox, turno, onPrint, onClose }: { title: string; code: string; value: string; type: TipoVehiculo; date: string; entryDate?: string; total?: number; timeTotal?: number; paymentMethod?: MedioPago; cashBox?: string; turno?: string; onPrint: () => void; onClose: () => void }) {
  const isExit = total !== undefined
  return <div className={`printable-receipt ${isExit ? 'printable-receipt--exit' : 'printable-receipt--entry'}`}><header><strong>PARKING CHAVi</strong><span>Software inteligente a tu servicio</span></header><h2>{title}</h2><ReceiptCode value={code} /><p className="receipt-plate">{type === 'Bicicleta' ? <span className="identifier">{value}</span> : <Plate value={value} />}</p><p className="receipt-vehicle-type"><VehicleTypeIndicator type={type} /></p>{isExit && timeTotal !== undefined && <p className="receipt-priority"><span>Tiempo facturado</span><strong>{formatDuration(timeTotal)}</strong></p>}{entryDate && <p className="receipt-date"><span>Entrada</span>{formatDate(entryDate)}</p>}<p className="receipt-date"><span>{isExit ? 'Salida' : 'Entrada'}</span>{formatDate(date)}</p>{isExit && <p className="receipt-details"><span>Forma de pago: {paymentMethod}</span><span>Caja #{cashBox} · {formatTurno(turno as 'AM' | 'PM' | 'T1' | 'T2' | 'T3')}</span></p>}{isExit && <p className="receipt-priority payment-total"><span>Total pagado</span><strong>{formatMoney(total)}</strong></p>}{!isExit && <p className="receipt-keep">Conserve este recibo</p>}<div className="receipt-actions"><button className="primary-module-button" type="button" onClick={onPrint}>Imprimir recibo</button><button className="text-action" type="button" onClick={onClose}>Continuar</button></div></div>
}
