import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { env } from './config/env.js'
import adminRoutes from './routes/adminRoutes.js'
import authRoutes from './routes/authRoutes.js'
import cartRoutes from './routes/cartRoutes.js'
import checkoutRoutes from './routes/checkoutRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import healthRoutes from './routes/healthRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import productRoutes from './routes/productRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import wishlistRoutes from './routes/wishlistRoutes.js'
import { fileURLToPath } from 'node:url'

const app = express()

app.disable('x-powered-by')
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", 'https://checkout.razorpay.com'],
        'connect-src': ["'self'", 'https://api.razorpay.com', 'https://*.razorpay.com'],
        'frame-src': ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
      },
    },
  }),
)
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
)
app.use(
  '/api/auth/forgot-password',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
)
app.use(
  '/api/auth/reset-password',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
)
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
)
app.use(cookieParser())
app.use(express.json({ limit: '50kb' }))
app.use(express.urlencoded({ extended: false, limit: '50kb' }))
app.use('/uploads', express.static(fileURLToPath(new URL('./uploads/', import.meta.url)), {
  dotfiles: 'deny',
  fallthrough: false,
  index: false,
  maxAge: env.NODE_ENV === 'production' ? '1d' : 0,
}))

app.use('/api/health', healthRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders/checkout', checkoutRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/products', productRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/categories', categoryRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
