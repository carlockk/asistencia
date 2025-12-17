const host = process.env.BREVO_SMTP_HOST;
const port = Number(process.env.BREVO_SMTP_PORT || 587);
const user = process.env.BREVO_SMTP_USER;
const pass = process.env.BREVO_SMTP_PASS;

function isConfigured() {
  return Boolean(host && port && user && pass);
}

let cachedTransport = null;

async function getTransport() {
  if (!isConfigured()) return null;
  if (cachedTransport) return cachedTransport;

  try {
    const nodemailer = (await import("nodemailer")).default;
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      auth: { user, pass }
    });
    return cachedTransport;
  } catch (err) {
    console.warn("nodemailer no disponible o no instalado, se omite envio", err.message);
    return null;
  }
}

export async function sendMail({ to, subject, text, html }) {
  const transport = await getTransport();
  if (!transport) {
    console.warn("Correo no configurado o sin nodemailer instalado. Se omite envio.");
    return { skipped: true };
  }
  if (!to) {
    console.warn("Correo sin destinatario. Se omite envio.");
    return { skipped: true };
  }
  try {
    await transport.sendMail({
      from: user,
      to,
      subject,
      text,
      html: html || text
    });
    return { sent: true };
  } catch (err) {
    console.error("Error enviando correo", err);
    return { sent: false, error: err.message };
  }
}
