import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { formatTurno } from '../utils/formatTurno'
import { abrirCaja, cajasAbiertas, cerrarCaja, verificarCaja } from '../api/caja.api'
import { ApiError } from '../api/http'
import type { CajaAbiertaDetalle, VerificacionCaja } from '../modules/caja/caja.types'

interface CashPageProps { token: string; operatorName: string; onDataChanged: () => void }
const money = (value: number): string => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
const date = (value: string): string => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const errorText = (error: unknown): string => error instanceof ApiError ? error.message : 'No fue posible completar la operación.'

export function CashPage({ token, operatorName, onDataChanged }: CashPageProps) {
  const [cashBox, setCashBox] = useState<CajaAbiertaDetalle | null>(null)
  const [realCash, setRealCash] = useState('')
  const [verification, setVerification] = useState<VerificacionCaja | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [closedBox, setClosedBox] = useState<CajaAbiertaDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (): Promise<void> => {
    try { setCashBox((await cajasAbiertas(token))[0] ?? null); setError('') } catch (loadError) { setError(errorText(loadError)) } finally { setLoading(false) }
  }, [token])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])

  const open = async (): Promise<void> => { setSaving(true); setError(''); try { setCashBox(await abrirCaja(token)); onDataChanged() } catch (openError) { setError(errorText(openError)) } finally { setSaving(false) } }
  const verify = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const value = Number(realCash)
    if (!cashBox || !Number.isInteger(value) || value < 0) { setError('Ingrese un efectivo real válido.'); return }
    setSaving(true); setError('')
    try { setVerification(await verificarCaja(token, cashBox.id_caja, value)); setConfirmClose(false) } catch (verifyError) { setError(errorText(verifyError)) } finally { setSaving(false) }
  }
  const close = async (): Promise<void> => {
    if (!cashBox || !verification) return
    setSaving(true); setError('')
    try { setClosedBox(await cerrarCaja(token, cashBox.id_caja, verification.efectivo_real)); setCashBox(null); setConfirmClose(false); onDataChanged() } catch (closeError) { setError(errorText(closeError)) } finally { setSaving(false) }
  }

  if (loading) return <section className="cash-page"><p>Cargando Mi Caja…</p></section>
  if (closedBox) return <section className="cash-page"><article className="cash-card cash-closed"><span className="eyebrow">TURNO CERRADO</span><h2>Caja cerrada correctamente</h2><p>Recaudo total: <strong>{money(closedBox.recaudo_total)}</strong></p><p>Faltante: {money(closedBox.faltante_caja)} · Sobrante: {money(closedBox.sobrante_caja)}</p><button className="primary-module-button" type="button" onClick={() => window.print()}>Imprimir cierre</button><button className="text-action" type="button" onClick={() => setClosedBox(null)}>Cerrar</button></article></section>
  if (!cashBox) return <section className="cash-page"><header className="module-page-header"><div><span className="eyebrow">OPERACIÓN</span><h2>Mi Caja</h2><p>Gestione únicamente su turno actual.</p></div></header><article className="cash-card no-cash"><span>$</span><h3>NO TIENE UNA CAJA ABIERTA</h3><p>Abra su Caja para registrar cobros durante el turno.</p>{error && <p className="module-message error">{error}</p>}<button className="primary-module-button" type="button" disabled={saving} onClick={() => void open()}>{saving ? 'Abriendo…' : 'Abrir Caja'}</button></article></section>

  return <section className="cash-page"><header className="module-page-header"><div><span className="eyebrow">OPERACIÓN</span><h2>Mi Caja</h2><p>Operador: {operatorName}</p></div><span className="state-pill activo">Abierta</span></header>{error && <p className="module-message error">{error}</p>}<section className="cash-info"><article><span>Turno</span><strong>{formatTurno(cashBox.turno)}</strong></article><article><span>Apertura</span><strong>{date(cashBox.fecha_hora_apertura)}</strong></article><article><span>Operador</span><strong>{operatorName}</strong></article></section><section className="cash-totals"><article className="cash-total-main"><span>RECAUDO TOTAL</span><strong>{money(cashBox.recaudo_total)}</strong></article><article><span>EFECTIVO</span><strong>{money(cashBox.total_efectivo)}</strong></article><article><span>NEQUI</span><strong>{money(cashBox.total_nequi)}</strong></article></section><article className="cash-card movements-unavailable"><h3>Movimientos del turno</h3><p>El Backend actual no expone el detalle de pagos por Caja.</p></article><article className="cash-card close-cash"><span className="eyebrow">CIERRE DE CAJA</span><h3>Verificar efectivo real</h3><p>Efectivo esperado: <strong>{money(cashBox.total_efectivo)}</strong></p><form onSubmit={verify}><label>Efectivo real contado<input inputMode="numeric" value={realCash} onChange={(event) => { setRealCash(event.target.value.replace(/\D/g, '')); setVerification(null); setConfirmClose(false) }} /></label><button className="primary-module-button" type="submit" disabled={saving}>{saving ? 'Verificando…' : 'Verificar'}</button></form>{verification && <div className="verification-result"><strong>{verification.faltante_caja > 0 ? 'FALTANTE' : verification.sobrante_caja > 0 ? 'SOBRANTE' : 'CUADRE CORRECTO'}</strong><p>Faltante: {money(verification.faltante_caja)}</p><p>Sobrante: {money(verification.sobrante_caja)}</p>{!confirmClose ? <button className="secondary-confirm" type="button" onClick={() => setConfirmClose(true)}>Cerrar Caja</button> : <div className="close-confirmation"><p>¿Confirma el cierre definitivo de la Caja?</p><button className="primary-module-button" type="button" disabled={saving} onClick={() => void close()}>Confirmar cierre</button><button className="text-action" type="button" onClick={() => setConfirmClose(false)}>Cancelar</button></div>}</div>}</article></section>
}
