import nodemailer from 'nodemailer'
import { readFileSync } from 'fs'
import { join } from 'path'

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) throw new Error('SMTP não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS)')

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

function renderTemplate(fileName: string, confirmationUrl: string): string {
  const html = readFileSync(join(process.cwd(), 'public', fileName), 'utf8')
  return html.replaceAll('{{ .ConfirmationURL }}', confirmationUrl)
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const transporter = getTransporter()
  const html = renderTemplate('email-recuperar-senha.html', resetUrl)
  await transporter.sendMail({
    from: `"MEI Control Pro" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Recuperação de senha — MEI Control Pro',
    html,
  })
}
