import { Router } from 'express'
import {
  createCheckout,
  getCheckoutConfig,
  getCheckoutQuote,
  markCheckoutPaymentFailed,
  verifyCheckoutPayment,
} from '../controllers/checkoutController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validateBody.js'
import {
  checkoutSchema,
  couponQuoteSchema,
  paymentFailureSchema,
  paymentVerificationSchema,
} from '../utils/checkoutValidation.js'

const router = Router()

router.use(requireAuth)
router.get('/config', getCheckoutConfig)
router.post('/quote', validateBody(couponQuoteSchema), getCheckoutQuote)
router.post('/', validateBody(checkoutSchema), createCheckout)
router.post('/verify-payment', validateBody(paymentVerificationSchema), verifyCheckoutPayment)
router.post('/payment-failed', validateBody(paymentFailureSchema), markCheckoutPaymentFailed)

export default router
