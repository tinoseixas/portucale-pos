
'use server';
/**
 * @fileOverview Servei d'enviament de correus electrònics.
 * Utilitza Resend per garantir l'entrega dels documents PDF.
 */

import { Resend } from 'resend';

// Nota: El client haurà de configurar RESEND_API_KEY a les seves variables d'entorn (.env)
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}

/**
 * Envia un correu electrònic amb fitxers adjunts (base64).
 */
export async function sendDocumentEmail({ to, subject, html, attachments }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY no està configurada.');
    return { success: false, error: 'Configuració de correu pendent (.env)' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'TS Serveis <onboarding@resend.dev>', // Nota: Resend permet enviar des del domini propi si es verifica.
      to: [to],
      subject: subject,
      html: html,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: a.content.split(',')[1], // Netegem el prefix data:application/pdf;base64,
      })),
    });

    if (error) {
      console.error('Error enviant correu:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Excepció enviant correu:', err);
    return { success: false, error: err.message || 'Error desconegut' };
  }
}
