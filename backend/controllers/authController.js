import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import User from '../models/User.js'
import { AUTH_COOKIE_NAME, authCookieOptions } from '../utils/authCookie.js'
import { sendPasswordResetEmail } from '../utils/email.js'
import { consumePasswordResetToken, createPasswordResetToken } from '../utils/passwordReset.js'

const PASSWORD_HASH_ROUNDS = 12
const passwordResetResponse = {
  message: 'If an account exists for that email, a password reset link has been sent.',
}

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    createdAt: user.createdAt,
  }
}

function createSessionToken(userId) {
  return jwt.sign({ sub: userId.toString() }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  })
}

function setSessionCookie(res, user) {
  res.cookie(AUTH_COOKIE_NAME, createSessionToken(user._id), authCookieOptions)
}

export async function register(req, res) {
  const { name, email, password } = req.validatedBody
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS)

  try {
    const user = await User.create({ name, email, password: passwordHash })
    setSessionCookie(res, user)
    res.status(201).json({ user: toPublicUser(user) })
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ message: 'An account with this email already exists' })
      return
    }

    throw error
  }
}

export async function login(req, res) {
  const { email, password } = req.validatedBody
  const user = await User.findOne({ email }).select('+password')

  if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ message: 'Invalid email or password' })
    return
  }

  setSessionCookie(res, user)
  res.json({ user: toPublicUser(user) })
// const passwordMatches = user
//   ? await bcrypt.compare(password, user.password)
//   : false

// console.log('LOGIN DEBUG:', {
//   email,
//   userFound: Boolean(user),
//   isActive: user?.isActive,
//   passwordExists: Boolean(user?.password),
//   passwordMatches,
// })

// if (!user || !user.isActive || !passwordMatches) {
//   res.status(401).json({ message: 'Invalid email or password' })
//   return
// }
}

export async function requestPasswordReset(req, res) {
  const user = await User.findOne({ email: req.validatedBody.email, isActive: true })

  if (user) {
    const resetToken = createPasswordResetToken()
    user.passwordResetTokenHash = resetToken.tokenHash
    user.passwordResetExpiresAt = resetToken.expiresAt
    await user.save()

    const resetUrl = new URL('/reset-password', env.CLIENT_URL)
    resetUrl.hash = new URLSearchParams({ token: resetToken.token }).toString()
    sendPasswordResetEmail(user.email, resetUrl.toString())
      .catch(() => console.error('Password reset email delivery failed'))
  }

  res.json(passwordResetResponse)
}

export async function resetPassword(req, res) {
  const { token, newPassword } = req.validatedBody
  const passwordHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS)
  const consumed = await consumePasswordResetToken({
    UserModel: User,
    token,
    passwordHash,
  })

  if (!consumed) {
    res.status(400).json({ message: 'This password reset link is invalid or has expired.' })
    return
  }

  res.json({ message: 'Password reset successfully. You can now sign in.' })
}

export function logout(_req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...authCookieOptions,
    maxAge: undefined,
  })
  res.status(204).end()
}

export function getCurrentUser(req, res) {
  res.json({ user: toPublicUser(req.user) })
}

export async function updateCurrentUser(req, res) {
  const user = await User.findByIdAndUpdate(req.user._id, req.validatedBody, {
    new: true,
    runValidators: true,
  })
    .select('_id name email role phone createdAt')
    .lean()

  if (!user) {
    res.status(404).json({ message: 'User not found' })
    return
  }

  res.json({ user: toPublicUser(user) })
}
