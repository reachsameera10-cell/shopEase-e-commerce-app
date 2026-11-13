import { env } from '../config/env.js'

export async function sendPasswordResetEmail(to, resetUrl) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error('Password reset email is not configured')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject: 'Reset your ShopEase password',
      text: `Use this link to reset your ShopEase password. It expires in 15 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Use the link below to reset your ShopEase password. It expires in 15 minutes.</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Password reset email delivery failed with status ${response.status}`)
  }
}
