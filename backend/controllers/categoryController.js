import Category from '../models/Category.js'

export async function listCategories(_req, res) {
  const categories = await Category.find({ isActive: true })
    .select('name slug description image')
    .sort({ sortOrder: 1, name: 1 })
    .lean()

  res.json({ categories })
}
