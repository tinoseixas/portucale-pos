'use server';
/**
 * @fileOverview Serviço de envio de e-mails.
 * Utiliza o Resend para garantir a entrega de documentos PDF.
 * Configurado para usar o e-mail da empresa do usuário: eg.ad.tecnica@gmail.com
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
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY não configurada no arquivo .env');
    return { success: false, error: 'Configuração de e-mail pendente (API Key)' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // O remetente padrão é o e-mail da sua empresa.
    // IMPORTANTE: Este e-mail deve ser verificado no painel do Resend (Single Sender Verification).
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'TS Serveis <eg.ad.tecnica@gmail.com>';

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
