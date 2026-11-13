import { createHash, randomBytes } from 'node:crypto'

export const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000

export function hashPasswordResetToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function createPasswordResetToken(now = new Date()) {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS),
  }
}

export async function consumePasswordResetToken({ UserModel, token, passwordHash, now = new Date() }) {
  const user = await UserModel.findOneAndUpdate(
    {
      passwordResetTokenHash: hashPasswordResetToken(token),
      passwordResetExpiresAt: { $gt: now },
    },
    {
      $set: { password: passwordHash },
      $unset: {
        passwordResetTokenHash: 1,
        passwordResetExpiresAt: 1,
      },
    },
    { new: true, runValidators: true },
  )

  return Boolean(user)
}
