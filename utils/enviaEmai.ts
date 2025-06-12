import nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail({ to, subject, text, html }: MailOptions) {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT), 
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });


  const mailOptions = {
    from: `"Pinduca Reviews" <${process.env.MAIL_FROM}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info)); 
    return info;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw new Error('Não foi possível enviar o email de recuperação.');
  }
}