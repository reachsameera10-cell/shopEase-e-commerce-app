// Runtime validation coverage for authentication and authorization boundaries.
import assert from 'node:assert/strict'
import test from 'node:test'
import { requireRole } from '../middleware/requireRole.js'
import { forgotPasswordSchema, registerSchema, resetPasswordSchema } from '../utils/authValidation.js'

function responseMock() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('registration normalizes email and never accepts a caller-supplied role', () => {
  const parsed = registerSchema.safeParse({
    name: ' Customer ',
    email: 'USER@EXAMPLE.COM ',
    password: 'a-secure-password',
  })

  assert.equal(parsed.success, true)
  assert.equal(parsed.data.email, 'user@example.com')
  assert.equal(registerSchema.safeParse({
    name: 'Customer',
    email: 'user@example.com',
    password: 'a-secure-password',
    role: 'admin',
  }).success, false)
})

test('password reset validation normalizes email and enforces an 8-character strong password', () => {
  assert.equal(forgotPasswordSchema.safeParse({ email: 'USER@EXAMPLE.COM ' }).data.email, 'user@example.com')
  assert.equal(resetPasswordSchema.safeParse({
    token: 'a'.repeat(43),
    newPassword: 'Abc123!x',
  }).success, true)
  assert.equal(resetPasswordSchema.safeParse({
    token: 'a'.repeat(43),
    newPassword: 'Abc12!x',
  }).success, false)
  assert.equal(resetPasswordSchema.safeParse({
    token: 'short',
    newPassword: 'Abc123!x',
  }).success, false)
  assert.equal(resetPasswordSchema.safeParse({
    token: 'a'.repeat(43),
    newPassword: 'weakpass',
  }).success, false)
  assert.equal(resetPasswordSchema.safeParse({
    token: 'a'.repeat(43),
    newPassword: `${'A1!'.repeat(24)}A`,
  }).success, false)
})

test('role middleware rejects unauthenticated and non-admin requests', () => {
  const response = responseMock()
  let nextCalled = false

  requireRole('admin')({}, response, () => {
    nextCalled = true
  })
  assert.equal(response.statusCode, 401)
  assert.equal(nextCalled, false)

  const customerResponse = responseMock()
  requireRole('admin')({ user: { role: 'customer' } }, customerResponse, () => {
    nextCalled = true
  })
  assert.equal(customerResponse.statusCode, 403)
  assert.equal(nextCalled, false)
})

test('role middleware allows an administrator', () => {
  const response = responseMock()
  let nextCalled = false

  requireRole('admin')({ user: { role: 'admin' } }, response, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, true)
  assert.equal(response.statusCode, null)
})
