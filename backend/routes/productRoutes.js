import { Router } from 'express'
import { getProduct, listProducts } from '../controllers/productController.js'
import { validateProductQuery } from '../middleware/validateProductQuery.js'

const router = Router()

router.get('/', validateProductQuery, listProducts)
router.get('/:idOrSlug', getProduct)

export default router
