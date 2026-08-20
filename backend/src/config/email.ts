import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export async function initEmailTransporter() {
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('Email Transporter: Custom SMTP configured.');
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Email Transporter: Created Ethereal test account:', testAccount.user);
      console.log('Test emails can be previewed using URLs printed in logs.');
    } catch (error) {
      console.error('Email Transporter: Failed to initialize Ethereal account, running in mock log-only mode.', error);
    }
  }
}

export function getTransporter(): nodemailer.Transporter | null {
  return transporter;
}
