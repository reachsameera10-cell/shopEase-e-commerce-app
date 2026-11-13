import assert from 'node:assert/strict'
import test from 'node:test'
import express from 'express'
import reviewRoutes from '../routes/reviewRoutes.js'

test('review creation, update, and deletion require authentication', async () => {
  const app = express()
  app.use('/api/reviews', reviewRoutes)
  const server = app.listen(0)
  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    const port = server.address().port
    const requests = [
      fetch(`http://127.0.0.1:${port}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      fetch(`http://127.0.0.1:${port}/api/reviews/0123456789abcdef01234567`, {
        method: 'PUT',
      }),
      fetch(`http://127.0.0.1:${port}/api/reviews/0123456789abcdef01234567`, {
        method: 'DELETE',
      }),
    ]

    const responses = await Promise.all(requests)
    assert.deepEqual(responses.map((response) => response.status), [401, 401, 401])
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
