import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

router.get('/', (_req, res) => {
  const isConnected = mongoose.connection.readyState === 1

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'ok' : 'degraded',
    database: isConnected ? 'connected' : 'disconnected',
  })
})

export default router
