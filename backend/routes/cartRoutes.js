import { Router } from 'express'
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../controllers/cartController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validateBody.js'
import { validateProductIdParam } from '../middleware/validateProductIdParam.js'
import {
  addCartItemSchema,
  updateCartItemSchema,
} from '../utils/shoppingValidation.js'

const router = Router()

router.use(requireAuth)
router.get('/', getCart)
router.post('/', validateBody(addCartItemSchema), addCartItem)
router.delete('/', clearCart)
router.put('/:productId', validateProductIdParam(), validateBody(updateCartItemSchema), updateCartItem)
router.delete('/:productId', validateProductIdParam(), removeCartItem)

export default router
