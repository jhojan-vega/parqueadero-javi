import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { actualizarColaborador, cambiarEstadoColaborador, crearColaborador, listarColaboradores, obtenerColaborador, restablecerContrasena } from '../api/colaboradores.api'
import { ApiError } from '../api/http'
import { etiquetaRol, type ColaboradorResumen, type EstadoColaborador, type RolAdministrable } from '../modules/colaboradores/colaborador.types'
import type { UserRole } from '../types/ui'

interface CollaboratorsPageProps { token: string; currentRole: UserRole }

type DialogMode = 'create' | 'view' | 'edit' | 'reset' | null
interface FormValues { nombre: string; documento: string; usuario: string; correo: string; contrasena: string; confirmacion: string; rol: RolAdministrable; estado: EstadoColaborador }

const initialForm = (role: RolAdministrable = 'Vigilante'): FormValues => ({ nombre: '', documento: '', usuario: '', correo: '', contrasena: '', confirmacion: '', rol: role, estado: 'activo' })
const errorMessage = (error: unknown): string => error instanceof ApiError ? error.message : 'No fue posible completar la operación. Inténtelo nuevamente.'

export function CollaboratorsPage({ token, currentRole }: CollaboratorsPageProps) {
  const [colaboradores, setColaboradores] = useState<ColaboradorResumen[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'todos' | UserRole>('todos')
  const [stateFilter, setStateFilter] = useState<'todos' | EstadoColaborador>('todos')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [selected, setSelected] = useState<ColaboradorResumen | null>(null)
  const [form, setForm] = useState<FormValues>(() => initialForm(currentRole === 'Administrador' ? 'Vigilante' : 'Administrador'))
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [saving, setSaving] = useState(false)

  const rolesDisponibles: RolAdministrable[] = currentRole === 'Ingeniero' ? ['Administrador', 'Vigilante'] : ['Vigilante']
  const canManage = (colaborador: ColaboradorResumen): boolean =>
    currentRole === 'Ingeniero' ? colaborador.rol !== 'Ingeniero' : colaborador.rol === 'Vigilante'

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await listarColaboradores(token)
      setColaboradores(response)
      setError('')
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-CO')
    return colaboradores.filter((colaborador) => {
      const matchesSearch = !query || [colaborador.nombre, colaborador.usuario, colaborador.documento].some((value) => value.toLocaleLowerCase('es-CO').includes(query))
      return matchesSearch && (roleFilter === 'todos' || colaborador.rol === roleFilter) && (stateFilter === 'todos' || colaborador.estado === stateFilter)
    })
  }, [colaboradores, roleFilter, search, stateFilter])

  const closeDialog = (): void => { setDialog(null); setSelected(null); setError(''); setResetPassword(''); setResetConfirmation('') }
  const setField = <K extends keyof FormValues>(field: K, value: FormValues[K]): void => setForm((current) => ({ ...current, [field]: value }))

  const openCreate = (): void => {
    setForm(initialForm(currentRole === 'Administrador' ? 'Vigilante' : 'Administrador'))
    setError('')
    setDialog('create')
  }

  const openSelected = async (mode: 'view' | 'edit' | 'reset', collaborator: ColaboradorResumen): Promise<void> => {
    setError('')
    setSaving(true)
    try {
      const detail = await obtenerColaborador(token, collaborator.id_colaborador)
      setSelected(detail)
      if (mode === 'edit') setForm({ ...initialForm(detail.rol === 'Administrador' ? 'Administrador' : 'Vigilante'), nombre: detail.nombre, documento: detail.documento, usuario: detail.usuario, correo: detail.correo ?? '', rol: detail.rol === 'Administrador' ? 'Administrador' : 'Vigilante', estado: detail.estado })
      setDialog(mode)
    } catch (detailError) { setError(errorMessage(detailError)) } finally { setSaving(false) }
  }

  const submitCollaborator = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.nombre.trim() || !form.documento.trim() || !form.usuario.trim() || (dialog === 'create' && !form.contrasena)) { setError('Complete los campos obligatorios.'); return }
    if (dialog === 'create' && form.contrasena.length < 4) { setError('La contraseña debe tener al menos 4 caracteres.'); return }
    if (dialog === 'create' && form.contrasena !== form.confirmacion) { setError('Las contraseñas no coinciden.'); return }
    setSaving(true); setError('')
    try {
      if (dialog === 'create') await crearColaborador(token, { nombre: form.nombre.trim(), documento: form.documento.trim(), usuario: form.usuario.trim(), correo: form.correo.trim() || null, contrasena: form.contrasena, rol: form.rol, estado: form.estado })
      if (dialog === 'edit' && selected) await actualizarColaborador(token, selected.id_colaborador, { nombre: form.nombre.trim(), documento: form.documento.trim(), usuario: form.usuario.trim(), correo: form.correo.trim() || null, rol: form.rol })
      setMessage(dialog === 'create' ? 'Colaborador creado correctamente.' : 'Datos del colaborador actualizados.')
      closeDialog(); await load()
    } catch (submitError) { setError(errorMessage(submitError)) } finally { setSaving(false) }
  }

  const toggleState = async (collaborator: ColaboradorResumen): Promise<void> => {
    setSaving(true); setError('')
    try {
      const next = collaborator.estado === 'activo' ? 'inactivo' : 'activo'
      await cambiarEstadoColaborador(token, collaborator.id_colaborador, next)
      setMessage(next === 'activo' ? 'Colaborador activado.' : 'Colaborador desactivado.')
      await load()
    } catch (stateError) { setError(errorMessage(stateError)) } finally { setSaving(false) }
  }

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    if (resetPassword.length < 4) { setError('La contraseña temporal debe tener al menos 4 caracteres.'); return }
    if (resetPassword !== resetConfirmation) { setError('Las contraseñas no coinciden.'); return }
    setSaving(true); setError('')
    try {
      await restablecerContrasena(token, selected.id_colaborador, resetPassword, resetConfirmation)
      setMessage('Contraseña temporal establecida. El colaborador deberá cambiarla al iniciar sesión.')
      closeDialog()
    } catch (resetError) { setError(errorMessage(resetError)) } finally { setSaving(false) }
  }

  return <section className="collaborators-page">
    <header className="module-page-header"><div><span className="eyebrow">ADMINISTRACIÓN</span><h2>Colaboradores</h2><p>Gestione cuentas operativas sin alterar el historial del sistema.</p></div><button className="primary-module-button" type="button" onClick={openCreate}>+ Nuevo colaborador</button></header>
    {message && <p className="module-message success" role="status">{message}</p>}{error && !dialog && <p className="module-message error" role="alert">{error}</p>}
    <section className="collaborators-toolbar" aria-label="Búsqueda y filtros"><input aria-label="Buscar por nombre, usuario o documento" placeholder="Buscar nombre, usuario o documento" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Filtrar por rol" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'todos' | UserRole)}><option value="todos">Todos los roles</option><option value="Vigilante">Vigilante</option><option value="Administrador">Administrador</option><option value="Ingeniero">Superadministrador</option></select><select aria-label="Filtrar por estado" value={stateFilter} onChange={(event) => setStateFilter(event.target.value as 'todos' | EstadoColaborador)}><option value="todos">Todos los estados</option><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select><span>{filtered.length} resultado(s)</span></section>
    <div className="collaborators-table-wrap"><table className="collaborators-table"><thead><tr><th>Nombre</th><th>Usuario</th><th>Documento</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{loading ? <tr><td colSpan={6}>Cargando colaboradores…</td></tr> : filtered.length === 0 ? <tr><td colSpan={6}>No se encontraron colaboradores.</td></tr> : filtered.map((collaborator) => <tr key={collaborator.id_colaborador}><td><strong>{collaborator.nombre}</strong></td><td>{collaborator.usuario}</td><td>{collaborator.documento}</td><td><span className={`role-pill role-${collaborator.rol.toLowerCase()}`}>{etiquetaRol(collaborator.rol)}</span></td><td><span className={`state-pill ${collaborator.estado}`}>{collaborator.estado}</span></td><td><div className="table-actions"><button type="button" onClick={() => void openSelected('view', collaborator)}>Ver</button>{canManage(collaborator) && <><button type="button" onClick={() => void openSelected('edit', collaborator)}>Editar</button><button type="button" onClick={() => void openSelected('reset', collaborator)}>Restablecer</button><button className={collaborator.estado === 'activo' ? 'danger-action' : ''} type="button" disabled={saving} onClick={() => void toggleState(collaborator)}>{collaborator.estado === 'activo' ? 'Desactivar' : 'Activar'}</button></>}</div></td></tr>)}</tbody></table></div>
    {dialog && <div className="dialog-backdrop" role="presentation"><section className="collaborator-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="dialog-close" type="button" aria-label="Cerrar" onClick={closeDialog}>×</button>{dialog === 'view' && selected && <><span className="eyebrow">DETALLE DE COLABORADOR</span><h2 id="dialog-title">{selected.nombre}</h2><dl className="collaborator-detail"><div><dt>Usuario</dt><dd>{selected.usuario}</dd></div><div><dt>Documento</dt><dd>{selected.documento}</dd></div><div><dt>Correo</dt><dd>{selected.correo ?? 'No registrado'}</dd></div><div><dt>Rol</dt><dd>{etiquetaRol(selected.rol)}</dd></div><div><dt>Estado</dt><dd>{selected.estado}</dd></div></dl></>}{(dialog === 'create' || dialog === 'edit') && <form onSubmit={submitCollaborator}><span className="eyebrow">{dialog === 'create' ? 'NUEVA CUENTA' : 'EDICIÓN DE COLABORADOR'}</span><h2 id="dialog-title">{dialog === 'create' ? 'Nuevo colaborador' : 'Editar colaborador'}</h2><div className="collaborator-form-grid"><label>Nombre<input value={form.nombre} onChange={(event) => setField('nombre', event.target.value)} /></label><label>Documento<input value={form.documento} onChange={(event) => setField('documento', event.target.value)} /></label><label>Usuario<input value={form.usuario} onChange={(event) => setField('usuario', event.target.value)} /></label><label>Correo <small>Opcional</small><input type="email" value={form.correo} onChange={(event) => setField('correo', event.target.value)} /></label>{dialog === 'create' && <><label>Contraseña<input type="password" autoComplete="new-password" value={form.contrasena} onChange={(event) => setField('contrasena', event.target.value)} /></label><label>Confirmar contraseña<input type="password" autoComplete="new-password" value={form.confirmacion} onChange={(event) => setField('confirmacion', event.target.value)} /></label></>}<label>Rol<select value={form.rol} onChange={(event) => setField('rol', event.target.value as RolAdministrable)}>{rolesDisponibles.map((role) => <option key={role} value={role}>{etiquetaRol(role)}</option>)}</select></label>{dialog === 'create' && <label>Estado<select value={form.estado} onChange={(event) => setField('estado', event.target.value as EstadoColaborador)}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>}</div>{error && <p className="module-message error" role="alert">{error}</p>}<button className="primary-module-button" type="submit" disabled={saving}>{saving ? 'Guardando…' : dialog === 'create' ? 'Crear colaborador' : 'Guardar cambios'}</button></form>}{dialog === 'reset' && selected && <form onSubmit={submitReset}><span className="eyebrow">RESTABLECIMIENTO ADMINISTRATIVO</span><h2 id="dialog-title">Contraseña temporal</h2><p>{selected.nombre} deberá cambiar esta contraseña en su próximo inicio de sesión.</p><label>Contraseña temporal<input type="password" autoComplete="new-password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /></label><label>Confirmar contraseña temporal<input type="password" autoComplete="new-password" value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} /></label>{error && <p className="module-message error" role="alert">{error}</p>}<button className="primary-module-button" type="submit" disabled={saving}>{saving ? 'Restableciendo…' : 'Establecer contraseña temporal'}</button></form>}</section></div>}
  </section>
}
