const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  if (process.env.NODE_ENV === 'development' && (!process.env.SMTP_USER || process.env.SMTP_USER === 'stub')) {
    console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
