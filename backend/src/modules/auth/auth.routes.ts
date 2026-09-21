import type { FastifyInstance } from 'fastify';
import { CorreoNoConfiguradoError, enviarCodigoRecuperacion } from './auth.email.service';
import { autenticar, autorizarRoles, rolesAdministrativos } from './auth.middleware';
import { cambiarContrasena, confirmarRecuperacion, iniciarSesion, invalidarRecuperacion, restablecerContrasena, solicitarRecuperacion } from './auth.service';
import type { CredencialesLogin } from './auth.types';

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const validarCredencialesLogin = (
  cuerpo: unknown,
): CredencialesLogin | null => {
  if (
    !esObjeto(cuerpo) ||
    Object.keys(cuerpo).some(
      (campo) => campo !== 'usuario' && campo !== 'contrasena',
    ) ||
    typeof cuerpo.usuario !== 'string' ||
    cuerpo.usuario.trim().length === 0 ||
    typeof cuerpo.contrasena !== 'string' ||
    cuerpo.contrasena.length === 0
  ) {
    return null;
  }

  return {
    usuario: cuerpo.usuario.trim(),
    contrasena: cuerpo.contrasena,
  };
};

export const rutasAuth = async (app: FastifyInstance): Promise<void> => {
  app.post('/auth/login', async (solicitud, respuesta) => {
    const credenciales = validarCredencialesLogin(solicitud.body);

    if (!credenciales) {
      return respuesta.status(400).send({
        mensaje: 'Usuario y contraseña son obligatorios',
      });
    }

    const resultado = await iniciarSesion(credenciales);

    if (resultado.resultado === 'credenciales_invalidas') {
      return respuesta.status(401).send({
        mensaje: 'Usuario o contraseña incorrectos',
      });
    }

    if (resultado.resultado === 'inactivo') {
      return respuesta.status(403).send({
        mensaje: 'Colaborador inactivo',
      });
    }

    const token = await respuesta.jwtSign({
      id_colaborador: resultado.colaborador.id_colaborador,
      rol: resultado.colaborador.rol,
    });

    return { token, colaborador: resultado.colaborador };
  });

  app.patch('/auth/cambiar-contrasena', { preHandler: [autenticar] }, async (solicitud, respuesta) => {
    const b=solicitud.body; if(!esObjeto(b)||Object.keys(b).length!==3||typeof b.contrasena_actual!=='string'||typeof b.nueva_contrasena!=='string'||typeof b.confirmacion_nueva_contrasena!=='string'||b.contrasena_actual.length===0||b.nueva_contrasena.length<4||b.nueva_contrasena!==b.confirmacion_nueva_contrasena) return respuesta.status(400).send({mensaje:'Datos de contraseña inválidos'});
    const ok=await cambiarContrasena(solicitud.user.id_colaborador,b.contrasena_actual,b.nueva_contrasena); return ok ? respuesta.send({mensaje:'Contraseña actualizada'}) : respuesta.status(401).send({mensaje:'Contraseña actual incorrecta'});
  });

  app.post('/auth/recuperacion/solicitar', async (solicitud, respuesta) => {
    const b=solicitud.body; if(!esObjeto(b)||Object.keys(b).length!==1||typeof b.correo!=='string'||!b.correo.trim()) return respuesta.status(400).send({mensaje:'Correo inválido'});
    const r=await solicitarRecuperacion(b.correo.trim()); if(!r.disponible) return respuesta.send({mensaje:'Si el correo es elegible, se enviará un código'});
    try { await enviarCodigoRecuperacion(b.correo.trim(),r.codigo!); return respuesta.send({mensaje:'Si el correo es elegible, se enviará un código'}); } catch(e) { await invalidarRecuperacion(r.id_recuperacion!); if(e instanceof CorreoNoConfiguradoError) return respuesta.status(503).send({mensaje:'Servicio de correo no configurado'}); throw e; }
  });

  app.post('/auth/recuperacion/confirmar', async (solicitud, respuesta) => {
    const b=solicitud.body; if(!esObjeto(b)||Object.keys(b).length!==4||typeof b.correo!=='string'||typeof b.codigo!=='string'||!/^\d{6}$/.test(b.codigo)||typeof b.nueva_contrasena!=='string'||typeof b.confirmacion_nueva_contrasena!=='string'||b.nueva_contrasena.length<4||b.nueva_contrasena!==b.confirmacion_nueva_contrasena) return respuesta.status(400).send({mensaje:'Datos de recuperación inválidos'});
    const ok=await confirmarRecuperacion(b.correo.trim(),b.codigo,b.nueva_contrasena); return ok ? respuesta.send({mensaje:'Contraseña actualizada'}) : respuesta.status(401).send({mensaje:'Código inválido o expirado'});
  });

  app.post<{ Params: { id: string } }>('/auth/restablecer/:id', { preHandler: [autenticar, autorizarRoles(...rolesAdministrativos)] }, async (solicitud, respuesta) => {
    const b=solicitud.body; if(!/^\d+$/.test(solicitud.params.id)||!esObjeto(b)||Object.keys(b).length!==2||typeof b.contrasena_temporal!=='string'||typeof b.confirmacion_contrasena_temporal!=='string'||b.contrasena_temporal.length<4||b.contrasena_temporal!==b.confirmacion_contrasena_temporal) return respuesta.status(400).send({mensaje:'Datos de restablecimiento inválidos'});
    const r=await restablecerContrasena(solicitud.params.id,b.contrasena_temporal,solicitud.user.rol as 'Administrador' | 'Ingeniero'); if(!r.rol) return respuesta.status(404).send({mensaje:'Colaborador no encontrado'});
    if(!r.permitido) return respuesta.status(403).send({mensaje:'No tiene permiso para restablecer esta contraseña'});
    return respuesta.send({mensaje:'Contraseña temporal establecida'});
  });
};
