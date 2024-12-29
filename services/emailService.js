// /services/emailService.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.mail.yahoo.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: true, // if using port 465 (SSL)
  auth: {
    user: process.env.SMTP_USER, // e.g., "innerlinkgamestudio@yahoo.com"
    pass: process.env.SMTP_PASS, // your Yahoo account password or app password
  },
});

async function sendMail(to, subject, text) {
  const mailOptions = {
    from: process.env.FROM_EMAIL || "innerlinkgamestudio@yahoo.com",
    to,
    subject,
    text,
    // html: "<b>Some HTML content</b>"
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendMail };
