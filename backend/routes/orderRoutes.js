import { Router } from 'express'
import {
  cancelMyOrder,
  getMyOrder,
  getMyOrders,
} from '../controllers/ordersController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateOrderIdParam } from '../middleware/validateOrderIdParam.js'
import { validateOrderListQuery } from '../middleware/validateOrderListQuery.js'

const router = Router()

router.use(requireAuth)
router.get('/my-orders', validateOrderListQuery, getMyOrders)
router.post('/:orderId/cancel', validateOrderIdParam, cancelMyOrder)
router.get('/:orderId', validateOrderIdParam, getMyOrder)

export default router
