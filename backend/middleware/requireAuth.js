import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import User from '../models/User.js'
import { AUTH_COOKIE_NAME } from '../utils/authCookie.js'

export async function requireAuth(req, res, next) {
  const authorization = req.get('authorization')
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const token = req.cookies?.[AUTH_COOKIE_NAME] || bearerToken

  if (!token) {
    res.status(401).json({ message: 'Authentication required' })
    return
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      res.status(401).json({ message: 'Invalid or expired authentication token' })
      return
    }

    const user = await User.findById(payload.sub)
      .select('_id name email role phone isActive createdAt')
      .lean()

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Invalid or expired authentication token' })
      return
    }

    req.user = user
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid or expired authentication token' })
      return
    }

    next(error)
  }
}
