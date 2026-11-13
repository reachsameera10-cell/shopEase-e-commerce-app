import multer from 'multer'

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      const error = new Error('Upload a JPEG, PNG, or WebP image')
      error.statusCode = 400
      callback(error)
      return
    }
    callback(null, true)
  },
})

export function parseAdminImage(req, res, next) {
  imageUpload.single('image')(req, res, (error) => {
    if (!error) {
      next()
      return
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'Images must be 5 MB or smaller' })
      return
    }
    res.status(error.statusCode || 400).json({ message: error.message || 'Image upload failed' })
  })
}
