import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { formatTurno } from '../utils/formatTurno'
import { actualizarNovedadesCaja, cajasAbiertas, historialCajas, obtenerCaja, resumenFaltantes } from '../api/caja.api'
import { listarColaboradores } from '../api/colaboradores.api'
import { ApiError } from '../api/http'
import type { CajaAbiertaDetalle, CajaHistorial, EstadoCaja, FiltrosCaja, ResumenFaltantes } from '../modules/caja/caja.types'
import type { ColaboradorResumen } from '../modules/colaboradores/colaborador.types'

interface BoxesPageProps { token: string }
type Tab = 'historial' | 'faltantes'

const money = (value: number): string => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
const date = (value: string | null): string => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
const errorText = (error: unknown): string => error instanceof ApiError ? error.message : 'No fue posible consultar las Cajas.'
const initialFilters = (): FiltrosCaja => ({})

export function BoxesPage({ token }: BoxesPageProps) {
  const [tab, setTab] = useState<Tab>('historial')
  const [filters, setFilters] = useState<FiltrosCaja>(initialFilters)
  const [stateFilter, setStateFilter] = useState<'todos' | EstadoCaja>('todos')
  const [turnFilter, setTurnFilter] = useState<'todos' | 'AM' | 'PM' | 'T1' | 'T2' | 'T3'>('todos')
  const [history, setHistory] = useState<CajaHistorial[]>([])
  const [openBoxes, setOpenBoxes] = useState<CajaAbiertaDetalle[]>([])
  const [shortages, setShortages] = useState<ResumenFaltantes[]>([])
  const [collaborators, setCollaborators] = useState<ColaboradorResumen[]>([])
  const [selected, setSelected] = useState<CajaAbiertaDetalle | null>(null)
  const [detailName, setDetailName] = useState('')
  const [novedades, setNovedades] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async (nextFilters: FiltrosCaja = filters): Promise<void> => {
    setLoading(true)
    try {
      const [nextHistory, nextOpenBoxes, nextShortages, nextCollaborators] = await Promise.all([
        historialCajas(token, nextFilters),
        cajasAbiertas(token),
        resumenFaltantes(token, nextFilters),
        listarColaboradores(token),
      ])
      setHistory(nextHistory)
      setOpenBoxes(nextOpenBoxes)
      setShortages(nextShortages)
      setCollaborators(nextCollaborators)
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

  const visibleHistory = useMemo(() => history.filter((box) =>
    (stateFilter === 'todos' || box.estado === stateFilter) &&
    (turnFilter === 'todos' || box.turno === turnFilter),
  ), [history, stateFilter, turnFilter])

  const totals = useMemo(() => history.reduce((total, box) => ({
    recaudo: total.recaudo + box.recaudo_total,
    efectivo: total.efectivo + box.total_efectivo,
    nequi: total.nequi + box.total_nequi,
    faltante: total.faltante + box.faltante_caja,
    sobrante: total.sobrante + box.sobrante_caja,
  }), { recaudo: 0, efectivo: 0, nequi: 0, faltante: 0, sobrante: 0 }), [history])

  const updateFilter = (field: keyof FiltrosCaja, value: string): void => {
    setFilters((current) => ({ ...current, [field]: value || undefined }))
  }

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void load(filters)
  }

  const resetFilters = (): void => {
    const next = initialFilters()
    setFilters(next)
    setStateFilter('todos')
    setTurnFilter('todos')
    void load(next)
  }

  const openDetail = async (box: CajaHistorial | CajaAbiertaDetalle): Promise<void> => {
    setSaving(true)
    setError('')
    try {
      const detail = await obtenerCaja(token, box.id_caja)
      setSelected(detail)
      setDetailName('nombre_colaborador' in box ? box.nombre_colaborador : collaborators.find((item) => item.id_colaborador === detail.id_colaborador)?.nombre ?? `Colaborador #${detail.id_colaborador}`)
      setNovedades(detail.novedades ?? '')
    } catch (detailError) {
      setError(errorText(detailError))
    } finally {
      setSaving(false)
    }
  }

  const saveNovedades = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      const updated = await actualizarNovedadesCaja(token, selected.id_caja, novedades.trim() || null)
      setSelected(updated)
      setMessage('Novedades actualizadas correctamente.')
      await load()
    } catch (saveError) {
      setError(errorText(saveError))
    } finally {
      setSaving(false)
    }
  }

  return <section className="boxes-page">
    <header className="module-page-header"><div><span className="eyebrow">ADMINISTRACIÓN</span><h2>Cajas</h2><p>Control y seguimiento de recaudos por turno.</p></div></header>
    {error && <p className="module-message error" role="alert">{error}</p>}
    {message && <p className="module-message success">{message}</p>}

    <section className="boxes-summary" aria-label="Resumen de Cajas">
      <article className="box-summary-main"><span>RECAUDO TOTAL</span><strong>{money(totals.recaudo)}</strong></article>
      <article><span>EFECTIVO</span><strong>{money(totals.efectivo)}</strong></article>
      <article><span>NEQUI</span><strong>{money(totals.nequi)}</strong></article>
      <article className={totals.faltante > 0 ? 'financial-alert shortage' : ''}><span>FALTANTES</span><strong>{money(totals.faltante)}</strong></article>
      <article className={totals.sobrante > 0 ? 'financial-alert surplus' : ''}><span>SOBRANTES</span><strong>{money(totals.sobrante)}</strong></article>
    </section>

    <section className="open-boxes-section"><div className="section-heading"><div><span className="eyebrow">SUPERVISIÓN</span><h2>Cajas abiertas</h2></div></div>{openBoxes.length === 0 ? <p className="empty-inline">No hay Cajas abiertas actualmente.</p> : <div className="open-boxes-grid">{openBoxes.map((box) => <article key={box.id_caja}><span className="state-pill activo">Abierta</span><strong>{collaborators.find((item) => item.id_colaborador === box.id_colaborador)?.nombre ?? `Colaborador #${box.id_colaborador}`}</strong><small>{formatTurno(box.turno)} · Apertura {date(box.fecha_hora_apertura)}</small><b>{money(box.recaudo_total)}</b><button type="button" onClick={() => void openDetail(box)}>Ver detalle</button></article>)}</div>}</section>

    <div className="boxes-tabs"><button type="button" className={tab === 'historial' ? 'active' : ''} onClick={() => setTab('historial')}>Historial de Cajas</button><button type="button" className={tab === 'faltantes' ? 'active' : ''} onClick={() => setTab('faltantes')}>Historial de faltantes</button></div>
    <form className="boxes-filters" onSubmit={applyFilters}><select value={filters.id_colaborador ?? ''} onChange={(event) => updateFilter('id_colaborador', event.target.value)}><option value="">Todos los operadores</option>{collaborators.map((item) => <option key={item.id_colaborador} value={item.id_colaborador}>{item.nombre}</option>)}</select><label>Desde<input type="date" value={filters.fecha_desde ?? ''} onChange={(event) => updateFilter('fecha_desde', event.target.value)} /></label><label>Hasta<input type="date" value={filters.fecha_hasta ?? ''} onChange={(event) => updateFilter('fecha_hasta', event.target.value)} /></label>{tab === 'historial' && <><select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as typeof stateFilter)}><option value="todos">Todos los estados</option><option value="abierta">Abierta</option><option value="cerrada">Cerrada</option><option value="pendiente">Pendiente</option></select><select value={turnFilter} onChange={(event) => setTurnFilter(event.target.value as typeof turnFilter)}><option value="todos">Todos los turnos</option><option value="T1">Turno 1</option><option value="T2">Turno 2</option><option value="T3">Turno 3</option><option value="AM">AM (histórico)</option><option value="PM">PM (histórico)</option></select></>}<button className="primary-module-button" type="submit">Consultar</button><button className="text-action" type="button" onClick={resetFilters}>Limpiar</button></form>

    {tab === 'historial' ? <div className="boxes-table-wrap"><table className="boxes-table"><thead><tr><th>Fecha</th><th>Turno</th><th>Operador</th><th>Apertura</th><th>Cierre</th><th>Recaudo</th><th>Efectivo</th><th>Nequi</th><th>Efectivo real</th><th>Faltante</th><th>Sobrante</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{loading ? <tr><td colSpan={13}>Cargando historial…</td></tr> : visibleHistory.length === 0 ? <tr><td colSpan={13}>No hay Cajas para los filtros seleccionados.</td></tr> : visibleHistory.map((box) => <tr key={box.id_caja}><td>{date(box.fecha_hora_apertura)}</td><td>{formatTurno(box.turno)}</td><td>{box.nombre_colaborador}</td><td>{date(box.fecha_hora_apertura)}</td><td>{date(box.fecha_hora_cierre)}</td><td>{money(box.recaudo_total)}</td><td>{money(box.total_efectivo)}</td><td>{money(box.total_nequi)}</td><td>{box.efectivo_real === null ? '—' : money(box.efectivo_real)}</td><td className={box.faltante_caja > 0 ? 'amount-shortage' : ''}>{money(box.faltante_caja)}</td><td className={box.sobrante_caja > 0 ? 'amount-surplus' : ''}>{money(box.sobrante_caja)}</td><td><span className={`state-pill ${box.estado}`}>{box.estado}</span></td><td><button type="button" onClick={() => void openDetail(box)}>Ver</button></td></tr>)}</tbody></table></div> : <div className="boxes-table-wrap"><table className="boxes-table shortages-table"><thead><tr><th>Operador</th><th>Cantidad de Cajas con faltante</th><th>Total faltantes</th></tr></thead><tbody>{loading ? <tr><td colSpan={3}>Cargando faltantes…</td></tr> : shortages.length === 0 ? <tr><td colSpan={3}>No hay faltantes en el período consultado.</td></tr> : shortages.map((item) => <tr key={item.id_colaborador}><td>{item.nombre}</td><td>{item.cantidad_cajas_con_faltante}</td><td className="amount-shortage">{money(item.total_faltantes)}</td></tr>)}</tbody></table></div>}

    {selected && <div className="dialog-backdrop" role="presentation"><section className="box-detail-dialog" role="dialog" aria-modal="true"><button className="dialog-close" type="button" onClick={() => { setSelected(null); setMessage('') }}>×</button><span className="eyebrow">DETALLE DE CAJA</span><h2>Caja #{selected.id_caja}</h2><dl className="box-detail"><div><dt>Operador</dt><dd>{detailName}</dd></div><div><dt>Turno</dt><dd>{formatTurno(selected.turno)}</dd></div><div><dt>Apertura</dt><dd>{date(selected.fecha_hora_apertura)}</dd></div><div><dt>Cierre</dt><dd>{date(selected.fecha_hora_cierre)}</dd></div><div><dt>Recaudo total</dt><dd>{money(selected.recaudo_total)}</dd></div><div><dt>Efectivo</dt><dd>{money(selected.total_efectivo)}</dd></div><div><dt>Nequi</dt><dd>{money(selected.total_nequi)}</dd></div><div><dt>Efectivo real</dt><dd>{selected.efectivo_real === null ? '—' : money(selected.efectivo_real)}</dd></div><div><dt>Faltante</dt><dd className={selected.faltante_caja > 0 ? 'amount-shortage' : ''}>{money(selected.faltante_caja)}</dd></div><div><dt>Sobrante</dt><dd className={selected.sobrante_caja > 0 ? 'amount-surplus' : ''}>{money(selected.sobrante_caja)}</dd></div><div><dt>Estado</dt><dd>{selected.estado}</dd></div><div><dt>Responsable de regularización</dt><dd>{selected.id_administrador_regulariza ?? 'No registrado'}</dd></div><div><dt>Regularización</dt><dd>{selected.fecha_hora_regularizacion ? date(selected.fecha_hora_regularizacion) : 'No registrada'}</dd></div></dl>{selected.estado === 'cerrada' ? <form className="novedades-form" onSubmit={(event) => void saveNovedades(event)}><label>Novedades<textarea value={novedades} onChange={(event) => setNovedades(event.target.value)} placeholder="Sin novedades registradas" /></label><button className="primary-module-button" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Editar novedad'}</button></form> : <p className="readonly-note">Los valores de una Caja abierta se muestran solo para consulta administrativa.</p>}</section></div>}
  </section>
}
