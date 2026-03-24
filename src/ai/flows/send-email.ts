'use server';
/**
 * @fileOverview Serviço de envio de e-mails via Resend.
 * Configurado para usar a Single Sender Verification com o e-mail eg.ad.tecnica@gmail.com.
 */

import { Resend } from 'resend';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}

/**
 * Envia um e-mail com arquivos anexos (base64).
 */
export async function sendDocumentEmail({ to, subject, html, attachments }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Portucale <eg.ad.tecnica@gmail.com>';

  if (!apiKey) {
    console.error('RESEND_API_KEY não configurada no arquivo .env');
    return { success: false, error: 'Configuração de e-mail pendente (API Key)' };
  }

  try {
    const resend = new Resend(apiKey);
    
    // O envio só funcionará se o e-mail eg.ad.tecnica@gmail.com estiver verificado no painel do Resend
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: subject,
      html: html,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: a.content.includes('base64,') ? a.content.split('base64,')[1] : a.content,
      })),
    });

    if (error) {
      console.error('Erro ao enviar e-mail via Resend:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Exceção ao enviar e-mail:', err);
    return { success: false, error: err.message || 'Erro desconhecido no servidor de e-mail' };
  }
}
