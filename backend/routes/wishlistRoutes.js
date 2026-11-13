import { Router } from 'express'
import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
} from '../controllers/wishlistController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validateBody.js'
import { validateProductIdParam } from '../middleware/validateProductIdParam.js'
import { wishlistItemSchema } from '../utils/shoppingValidation.js'

const router = Router()

router.use(requireAuth)
router.get('/', getWishlist)
router.post('/', validateBody(wishlistItemSchema), addWishlistItem)
router.delete('/:productId', validateProductIdParam(), removeWishlistItem)

export default router
