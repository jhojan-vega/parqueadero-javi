import nodemailer from 'nodemailer';

export class CorreoNoConfiguradoError extends Error {}

export const enviarCodigoRecuperacion = async (correo: string, codigo: string): Promise<void> => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    throw new CorreoNoConfiguradoError('SMTP no configurado');
  }
  const transporte = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT), secure: Number(SMTP_PORT) === 465, auth: { user: SMTP_USER, pass: SMTP_PASSWORD } });
  await transporte.sendMail({ from: SMTP_FROM, to: correo, subject: 'Código de recuperación SIGP', text: `Su código de recuperación es ${codigo}. Vence en 10 minutos.` });
};
