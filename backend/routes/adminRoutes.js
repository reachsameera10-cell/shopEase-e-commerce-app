import { Router } from 'express'
import {
  archiveProduct,
  createCategory,
  createProduct,
  deactivateCategory,
  getDashboard,
  listAdminCategories,
  listAdminCustomers,
  listAdminOrders,
  listAdminProducts,
  listAdminReviews,
  updateAdminOrderStatus,
  updateAdminReviewStatus,
  updateCategory,
  updateProduct,
  uploadAdminImage,
} from '../controllers/adminController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validateAdminIdParam } from '../middleware/validateAdminIdParam.js'
import { validateAdminListQuery } from '../middleware/validateAdminListQuery.js'
import { parseAdminImage } from '../middleware/adminImageUpload.js'
import { validateBody } from '../middleware/validateBody.js'
import {
  createCategorySchema,
  createProductSchema,
  updateCategorySchema,
  updateOrderStatusSchema,
  updateProductSchema,
  updateReviewStatusSchema,
} from '../utils/adminValidation.js'

const router = Router()
const requireAdmin = [requireAuth, requireRole('admin')]

router.use(...requireAdmin)

router.get('/dashboard', getDashboard)

router.get('/products', validateAdminListQuery, listAdminProducts)
router.post('/products', validateBody(createProductSchema), createProduct)
router.put('/products/:productId', validateAdminIdParam('productId'), validateBody(updateProductSchema), updateProduct)
router.delete('/products/:productId', validateAdminIdParam('productId'), archiveProduct)

router.get('/categories', listAdminCategories)
router.post('/categories', validateBody(createCategorySchema), createCategory)
router.put('/categories/:categoryId', validateAdminIdParam('categoryId'), validateBody(updateCategorySchema), updateCategory)
router.delete('/categories/:categoryId', validateAdminIdParam('categoryId'), deactivateCategory)

router.post('/uploads', parseAdminImage, uploadAdminImage)

router.get('/orders', validateAdminListQuery, listAdminOrders)
router.put('/orders/:orderId/status', validateAdminIdParam('orderId'), validateBody(updateOrderStatusSchema), updateAdminOrderStatus)

router.get('/customers', validateAdminListQuery, listAdminCustomers)

router.get('/reviews', validateAdminListQuery, listAdminReviews)
router.put('/reviews/:reviewId/status', validateAdminIdParam('reviewId'), validateBody(updateReviewStatusSchema), updateAdminReviewStatus)

export default router
