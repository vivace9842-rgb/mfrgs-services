import sgMail from '@sendgrid/mail';

export async function sendEmailWithPdf({ to, subject, text, html, attachments = [] }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Aviso: SENDGRID_API_KEY não configurada no ambiente.');
    return;
  }
  
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: subject,
    text: text,
    html: html,
    attachments: attachments,
  };

  try {
    await sgMail.send(msg);
    console.log(`E-mail enviado com sucesso para: ${to}`);
  } catch (error) {
    console.error('Erro crítico ao enviar e-mail via SendGrid:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw error;
  }
}