import { env } from '../config/env.js'

export const AUTH_COOKIE_NAME = 'shopease_session'

const cookieSecurityOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
}

export const authCookieOptions = {
  ...cookieSecurityOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

export const authCookieClearOptions = cookieSecurityOptions
