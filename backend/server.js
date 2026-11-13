import mongoose from 'mongoose'
import app from './app.js'
import { connectDB } from './config/db.js'
import { env } from './config/env.js'
import { releaseExpiredReservations } from './controllers/checkoutController.js'

async function startServer() {
  await connectDB()

  const server = app.listen(env.PORT, () => {
    console.info(`API listening on port ${env.PORT}`)
  })
  const reservationCleanup = setInterval(() => {
    releaseExpiredReservations().catch((error) => {
      console.error('Failed to clean up expired checkout reservations', error)
    })
  }, 60 * 1000)
  reservationCleanup.unref()
  releaseExpiredReservations().catch((error) => {
    console.error('Failed to clean up expired checkout reservations', error)
  })

  const shutdown = (signal) => {
    console.info(`${signal} received; closing API server`)
    clearInterval(reservationCleanup)

    server.close((error) => {
      if (error) {
        console.error('Failed to close API server cleanly', error)
        process.exitCode = 1
      }

      mongoose
        .disconnect()
        .then(() => {
          process.exitCode = error ? 1 : 0
        })
        .catch((disconnectError) => {
          console.error('Failed to disconnect from MongoDB', disconnectError)
          process.exitCode = 1
        })
    })
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
}

startServer().catch((error) => {
  console.error('Failed to start API server', error)
  process.exitCode = 1
})
