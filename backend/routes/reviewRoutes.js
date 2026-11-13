import { Router } from 'express'
import {
  createProductReview,
  deleteProductReview,
  getReviewEligibility,
  listProductReviews,
  updateProductReview,
} from '../controllers/reviewsController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validateBody.js'
import { validateProductIdParam } from '../middleware/validateProductIdParam.js'
import { validateReviewListQuery } from '../middleware/validateReviewListQuery.js'
import { createReviewSchema, updateReviewSchema } from '../utils/reviewValidation.js'

const router = Router()

router.post('/', requireAuth, validateBody(createReviewSchema), createProductReview)
router.put('/:reviewId', requireAuth, validateProductIdParam('reviewId'), validateBody(updateReviewSchema), updateProductReview)
router.delete('/:reviewId', requireAuth, validateProductIdParam('reviewId'), deleteProductReview)
router.get('/:productId/eligibility', requireAuth, validateProductIdParam(), getReviewEligibility)
router.get('/:productId', validateProductIdParam(), validateReviewListQuery, listProductReviews)

export default router
