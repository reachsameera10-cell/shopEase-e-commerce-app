import { Router } from 'express'
import {
  getCurrentUser,
  login,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
  updateCurrentUser,
} from '../controllers/authController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validateBody.js'
import {
  loginSchema,
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../utils/authValidation.js'

const router = Router()

router.post('/register', validateBody(registerSchema), register)
router.post('/login', validateBody(loginSchema), login)
router.post('/forgot-password', validateBody(forgotPasswordSchema), requestPasswordReset)
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword)
router.post('/logout', logout)
router.get('/me', requireAuth, getCurrentUser)
router.patch('/me', requireAuth, validateBody(updateProfileSchema), updateCurrentUser)

export default router
