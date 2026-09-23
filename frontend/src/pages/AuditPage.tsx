import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { actualizarObservacionesAuditoria, crearAuditoria, historialAuditorias } from '../api/auditoria.api'
import { listarColaboradores } from '../api/colaboradores.api'
import { ApiError } from '../api/http'
import type { AuditoriaHistorial, CrearAuditoriaInput, FiltrosAuditoria } from '../modules/auditoria/auditoria.types'
import type { ColaboradorResumen } from '../modules/colaboradores/colaborador.types'

interface AuditPageProps { token: string; auditorName: string }
type Tab = 'new' | 'history'
interface AuditForm { carros: string; motos: string; bicicletas: string; observaciones: string }

const emptyForm = (): AuditForm => ({ carros: '', motos: '', bicicletas: '', observaciones: '' })
const date = (value: string): string => new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const count = (value: string): number | null => /^\d+$/.test(value) ? Number(value) : null
const errorText = (error: unknown): string => error instanceof ApiError ? error.message : 'No fue posible completar la auditoría.'
const differenceText = (value: number): string => value === 0 ? 'SIN DIFERENCIA' : value > 0 ? `+${value}` : String(value)
const statusOf = (carros: number, motos: number, bicicletas: number): string => carros > 0 || motos > 0 || bicicletas > 0 ? 'ALERTA DE OCUPACIÓN' : carros < 0 || motos < 0 || bicicletas < 0 ? 'REVISAR DIFERENCIAS' : 'SIN DIFERENCIAS'
const explanation = (value: number): string => value > 0 ? 'ALERTA — VEHÍCULOS NO EXPLICADOS' : value < 0 ? 'REVISAR — SERVICIOS ACTIVOS SIN CORRESPONDENCIA FÍSICA' : 'SIN DIFERENCIA'
const historyStatusClass = (carros: number, motos: number, bicicletas: number): 'alert' | 'review' | 'clear' => carros > 0 || motos > 0 || bicicletas > 0 ? 'alert' : carros < 0 || motos < 0 || bicicletas < 0 ? 'review' : 'clear'

export function AuditPage({ token, auditorName }: AuditPageProps) {
  const [tab, setTab] = useState<Tab>('new')
  const [form, setForm] = useState<AuditForm>(emptyForm)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<AuditoriaHistorial | null>(null)
  const [history, setHistory] = useState<AuditoriaHistorial[]>([])
  const [collaborators, setCollaborators] = useState<ColaboradorResumen[]>([])
  const [filters, setFilters] = useState<FiltrosAuditoria>({})
  const [selected, setSelected] = useState<AuditoriaHistorial | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [novedad, setNovedad] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (nextFilters: FiltrosAuditoria = filters): Promise<void> => {
    setLoading(true)
    try {
      const [audits, people] = await Promise.all([historialAuditorias(token, nextFilters), listarColaboradores(token)])
      setHistory(audits)
      setCollaborators(people)
      setError('')
    } catch (loadError) {
      setError(errorText(loadError))
    } finally {
      setLoading(false)
    }
  }, [filters, token])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const nameOf = (id: string | null): string => id ? collaborators.find((item) => item.id_colaborador === id)?.nombre ?? `Colaborador #${id}` : 'Sin contexto'
  const setCount = (field: 'carros' | 'motos' | 'bicicletas', value: string): void => setForm((current) => ({ ...current, [field]: value.replace(/\D/g, '') }))
  const cancel = (): void => { setForm(emptyForm()); setConfirming(false); setResult(null); setError(''); setTab('history') }

  const review = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if ([count(form.carros), count(form.motos), count(form.bicicletas)].some((value) => value === null)) {
      setError('Ingrese conteos físicos enteros iguales o mayores a cero.')
      return
    }
    setError('')
    setConfirming(true)
  }

  const register = async (): Promise<void> => {
    const carros_fisico = count(form.carros)
    const motos_fisico = count(form.motos)
    const bicicletas_fisico = count(form.bicicletas)
    if (carros_fisico === null || motos_fisico === null || bicicletas_fisico === null) return
    const payload: CrearAuditoriaInput = { carros_fisico, motos_fisico, bicicletas_fisico }
    setSaving(true)
    setError('')
    try {
      setResult(await crearAuditoria(token, payload))
      setConfirming(false)
      await load()
    } catch (registerError) {
      setError(errorText(registerError))
    } finally {
      setSaving(false)
    }
  }

  const saveNovedad = async (): Promise<void> => {
    if (!result) return
    setSaving(true)
    setError('')
    try {
      setResult(await actualizarObservacionesAuditoria(token, result.id_auditoria, novedad.trim() || null))
      setNotice('Novedad registrada.')
      await load()
    } catch (saveError) {
      setError(errorText(saveError))
    } finally {
      setSaving(false)
    }
  }

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => { event.preventDefault(); void load(filters) }
  const resetFilters = (): void => { setFilters({}); void load({}) }
  const renderDifference = (label: string, system: number, physical: number, difference: number) => <article className={`audit-difference ${difference === 0 ? 'equal' : difference > 0 ? 'positive' : 'negative'}`}><h3>{label}</h3><p>Sistema: <strong>{system}</strong></p><p>Físico: <strong>{physical}</strong></p><b>Diferencia: {differenceText(difference)}</b><small>{explanation(difference)}</small></article>

  return <section className="audit-page"><header className="module-page-header"><div><span className="eyebrow">CONTROL DE OCUPACIÓN</span><h2>Auditoría</h2><p>Comparación entre ocupación física y Servicios activos registrados.</p></div></header>{error && <p className="module-message error" role="alert">{error}</p>}<div className="audit-tabs"><button className={tab === 'new' ? 'active' : ''} type="button" onClick={() => { setTab('new'); setResult(null); setError('') }}>Nueva auditoría</button><button className={tab === 'history' ? 'active' : ''} type="button" onClick={() => { setTab('history'); setResult(null); setError('') }}>Historial</button></div>
    {tab === 'new' && !result && <section className="audit-form-card"><button className="dialog-close" type="button" aria-label="Cancelar auditoría" onClick={cancel}>×</button>{!confirming ? <form onSubmit={review}><p className="audit-auditor">Auditor: <strong>{auditorName}</strong></p><span className="eyebrow">CONTEO FÍSICO INDEPENDIENTE</span><section className="physical-counts"><label>Carros<span>Conteo físico</span><input inputMode="numeric" value={form.carros} onChange={(event) => setCount('carros', event.target.value)} /></label><label>Motos<span>Conteo físico</span><input inputMode="numeric" value={form.motos} onChange={(event) => setCount('motos', event.target.value)} /></label><label>Bicicletas<span>Conteo físico</span><input inputMode="numeric" value={form.bicicletas} onChange={(event) => setCount('bicicletas', event.target.value)} /></label></section><div className="audit-actions"><button className="text-action" type="button" onClick={cancel}>Cancelar</button><button className="primary-module-button" type="submit">Revisar auditoría</button></div></form> : <section className="audit-confirmation"><span className="eyebrow">VERIFIQUE EL CONTEO FÍSICO</span><h2>Revise antes de comparar</h2><p>Auditor: <strong>{auditorName}</strong></p><section className="audit-confirm-counts"><article><span>Carros</span><strong>{form.carros}</strong><small>Físico</small></article><article><span>Motos</span><strong>{form.motos}</strong><small>Físico</small></article><article><span>Bicicletas</span><strong>{form.bicicletas}</strong><small>Físico</small></article></section><div className="audit-actions"><button className="text-action" type="button" disabled={saving} onClick={() => setConfirming(false)}>Corregir datos</button><button className="primary-module-button" type="button" disabled={saving} onClick={() => void register()}>{saving ? 'Registrando…' : 'Registrar y comparar'}</button></div></section>}</section>}
    {tab === 'new' && result && <section className="audit-result"><span className="eyebrow">RESULTADO DE AUDITORÍA</span><h2>{statusOf(result.carros_fisico - result.carros_sistema, result.motos_fisico - result.motos_sistema, result.bicicletas_fisico - result.bicicletas_sistema)}</h2><div className="audit-differences">{renderDifference('Carros', result.carros_sistema, result.carros_fisico, result.carros_fisico - result.carros_sistema)}{renderDifference('Motos', result.motos_sistema, result.motos_fisico, result.motos_fisico - result.motos_sistema)}{renderDifference('Bicicletas', result.bicicletas_sistema, result.bicicletas_fisico, result.bicicletas_fisico - result.bicicletas_sistema)}</div><section className="audit-novedad"><span className="eyebrow">NOVEDADES DE AUDITORÍA</span><textarea value={novedad} onChange={(event) => { setNovedad(event.target.value); setNotice('') }} placeholder="Registre la novedad derivada del resultado, si corresponde." />{notice && <p className="module-message success">{notice}</p>}<button className="primary-module-button" type="button" disabled={saving} onClick={() => void saveNovedad()}>{saving ? 'Guardando…' : 'Guardar novedad'}</button></section><button className="primary-module-button" type="button" onClick={() => { setForm(emptyForm()); setResult(null); setNovedad(''); setNotice('') }}>Finalizar auditoría</button><button className="text-action" type="button" onClick={() => setTab('history')}>Ver historial</button></section>}
    {tab === 'history' && <><form className="audit-filters" onSubmit={applyFilters}><select value={filters.id_administrador_auditor ?? ''} onChange={(event) => setFilters((current) => ({ ...current, id_administrador_auditor: event.target.value || undefined }))}><option value="">Todos los auditores</option>{collaborators.map((item) => <option key={item.id_colaborador} value={item.id_colaborador}>{item.nombre}</option>)}</select><label>Desde<input type="date" value={filters.fecha_desde ?? ''} onChange={(event) => setFilters((current) => ({ ...current, fecha_desde: event.target.value || undefined }))} /></label><label>Hasta<input type="date" value={filters.fecha_hasta ?? ''} onChange={(event) => setFilters((current) => ({ ...current, fecha_hasta: event.target.value || undefined }))} /></label><button className="primary-module-button" type="submit">Consultar</button><button className="text-action" type="button" onClick={resetFilters}>Limpiar</button></form><div className="audit-history-table"><table><thead><tr><th>Fecha</th><th>Auditor</th><th>Carros</th><th>Motos</th><th>Bicicletas</th><th>Estado general</th><th></th></tr></thead><tbody>{loading ? <tr><td colSpan={7}>Cargando auditorías…</td></tr> : history.length === 0 ? <tr><td colSpan={8}>No hay auditorías para los filtros seleccionados.</td></tr> : history.map((audit) => <tr key={audit.id_auditoria} className={`audit-history-${historyStatusClass(audit.diferencia_carros, audit.diferencia_motos, audit.diferencia_bicicletas)}`}><td>{date(audit.fecha_hora)}</td><td>{nameOf(audit.id_administrador_auditor)}</td><td className={audit.diferencia_carros > 0 ? 'difference-positive' : audit.diferencia_carros < 0 ? 'difference-negative' : ''}>{differenceText(audit.diferencia_carros)}</td><td className={audit.diferencia_motos > 0 ? 'difference-positive' : audit.diferencia_motos < 0 ? 'difference-negative' : ''}>{differenceText(audit.diferencia_motos)}</td><td className={audit.diferencia_bicicletas > 0 ? 'difference-positive' : audit.diferencia_bicicletas < 0 ? 'difference-negative' : ''}>{differenceText(audit.diferencia_bicicletas)}</td><td><span className={`audit-status ${historyStatusClass(audit.diferencia_carros, audit.diferencia_motos, audit.diferencia_bicicletas)}`}>{statusOf(audit.diferencia_carros, audit.diferencia_motos, audit.diferencia_bicicletas)}</span>{audit.observaciones?.trim() && <span className="audit-novelty-badge">CON NOVEDAD</span>}</td><td><button type="button" onClick={() => setSelected(audit)}>Ver detalle</button></td></tr>)}</tbody></table></div></>}
    {selected && <div className="dialog-backdrop" role="presentation"><section className="audit-detail-dialog" role="dialog" aria-modal="true"><button className="dialog-close" type="button" onClick={() => setSelected(null)}>×</button><span className="eyebrow">AUDITORÍA HISTÓRICA</span><h2>{statusOf(selected.diferencia_carros, selected.diferencia_motos, selected.diferencia_bicicletas)}</h2><p>Auditor: <strong>{nameOf(selected.id_administrador_auditor)}</strong> · {date(selected.fecha_hora)}</p><div className="audit-differences">{renderDifference('Carros', selected.carros_sistema, selected.carros_fisico, selected.diferencia_carros)}{renderDifference('Motos', selected.motos_sistema, selected.motos_fisico, selected.diferencia_motos)}{renderDifference('Bicicletas', selected.bicicletas_sistema, selected.bicicletas_fisico, selected.diferencia_bicicletas)}</div>{selected.id_operador_auditado || selected.id_caja ? <p className="audit-context">Contexto histórico: {selected.id_operador_auditado ? `operador ${nameOf(selected.id_operador_auditado)}` : 'sin operador'}{selected.id_caja ? ` · Caja #${selected.id_caja}` : ''}</p> : null}<p>Observaciones: {selected.observaciones ?? 'Sin observaciones.'}</p></section></div>}
  </section>
}
