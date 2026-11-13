import assert from 'node:assert/strict'
import test from 'node:test'
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from '../utils/passwordReset.js'

function createUserModel(user) {
  return {
    async findOneAndUpdate(filter, update) {
      const tokenMatches = user.passwordResetTokenHash === filter.passwordResetTokenHash
      const tokenIsLive = user.passwordResetExpiresAt > filter.passwordResetExpiresAt.$gt
      if (!tokenMatches || !tokenIsLive) return null

      user.password = update.$set.password
      delete user.passwordResetTokenHash
      delete user.passwordResetExpiresAt
      return user
    },
  }
}

test('password reset tokens are random, hashed, and expire after 15 minutes', () => {
  const now = new Date('2026-01-01T00:00:00.000Z')
  const token = createPasswordResetToken(now)

  assert.notEqual(token.token, token.tokenHash)
  assert.equal(token.tokenHash, hashPasswordResetToken(token.token))
  assert.equal(token.expiresAt.getTime(), now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS)
})

test('a valid password reset token is consumed and updates the password once', async () => {
  const now = new Date()
  const reset = createPasswordResetToken(now)
  const user = {
    passwordResetTokenHash: reset.tokenHash,
    passwordResetExpiresAt: reset.expiresAt,
  }
  const consumed = await consumePasswordResetToken({
    UserModel: createUserModel(user),
    token: reset.token,
    passwordHash: 'bcrypt-password-hash',
    now,
  })

  assert.equal(consumed, true)
  assert.equal(user.password, 'bcrypt-password-hash')
  assert.equal('passwordResetTokenHash' in user, false)
  assert.equal('passwordResetExpiresAt' in user, false)
})

test('expired password reset tokens are rejected', async () => {
  const now = new Date()
  const reset = createPasswordResetToken(new Date(now.getTime() - PASSWORD_RESET_TOKEN_TTL_MS - 1))
  const user = {
    passwordResetTokenHash: reset.tokenHash,
    passwordResetExpiresAt: reset.expiresAt,
  }

  assert.equal(await consumePasswordResetToken({
    UserModel: createUserModel(user),
    token: reset.token,
    passwordHash: 'bcrypt-password-hash',
    now,
  }), false)
  assert.equal(user.password, undefined)
})

test('invalid and already-used password reset tokens are rejected', async () => {
  const now = new Date()
  const reset = createPasswordResetToken(now)
  const user = {
    passwordResetTokenHash: reset.tokenHash,
    passwordResetExpiresAt: reset.expiresAt,
  }
  const UserModel = createUserModel(user)

  assert.equal(await consumePasswordResetToken({
    UserModel,
    token: createPasswordResetToken(now).token,
    passwordHash: 'invalid-token-hash',
    now,
  }), false)

  assert.equal(await consumePasswordResetToken({
    UserModel,
    token: reset.token,
    passwordHash: 'bcrypt-password-hash',
    now,
  }), true)
  assert.equal(await consumePasswordResetToken({
    UserModel,
    token: reset.token,
    passwordHash: 'second-password-hash',
    now,
  }), false)
  assert.equal(user.password, 'bcrypt-password-hash')
})
