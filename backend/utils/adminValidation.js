import { z } from 'zod'

const slugSchema = z.string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

const imageSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  alt: z.string().trim().max(160).optional().default(''),
  publicId: z.string().trim().regex(/^shopease\/products\/[A-Za-z0-9_-]+$/).optional(),
}).strict()

const productShape = {
  name: z.string().trim().min(1).max(160),
  slug: slugSchema,
  description: z.string().trim().min(1).max(10000),
  brand: z.string().trim().max(100).optional().default(''),
  images: z.array(imageSchema).min(1).max(8),
  price: z.coerce.number().finite().min(0).max(100000000),
  discountPrice: z.preprocess(
    (value) => value === '' ? null : value,
    z.union([
      z.null(),
      z.coerce.number().finite().min(0).max(100000000),
    ]).optional(),
  ),
  category: z.string().regex(/^[a-f\d]{24}$/i),
  stock: z.coerce.number().int().min(0).max(10000000),
  isFeatured: z.boolean().default(false),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
}

export const createProductSchema = z.object(productShape).strict().superRefine((product, context) => {
  if (product.discountPrice != null && product.discountPrice >= product.price) {
    context.addIssue({
      code: 'custom',
      path: ['discountPrice'],
      message: 'Discount price must be less than the regular price',
    })
  }
})

export const updateProductSchema = z.object(productShape).partial().strict().superRefine((product, context) => {
  if (
    product.discountPrice != null
    && product.price !== undefined
    && product.discountPrice >= product.price
  ) {
    context.addIssue({
      code: 'custom',
      path: ['discountPrice'],
      message: 'Discount price must be less than the regular price',
    })
  }
})

const categoryShape = {
  name: z.string().trim().min(1).max(80),
  slug: slugSchema,
  description: z.string().trim().max(500).optional().default(''),
  image: z.string().trim().max(2048).optional().default(''),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
}

export const createCategorySchema = z.object(categoryShape).strict()
export const updateCategorySchema = z.object(categoryShape).partial().strict()

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.string().trim().max(30).optional(),
}).strict()

export const updateOrderStatusSchema = z.object({
  status: z.enum(['processing', 'shipped', 'delivered']),
  cashCollected: z.boolean().default(false),
}).strict()

export const updateReviewStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
}).strict()
