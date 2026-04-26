const { Router } = require('express')
const { upload } = require('../middleware/upload')
const {
  uploadGarment,
  listGarments,
  getGarment,
  overrideClassification,
  completeGarment,
  getImage,
} = require('../controllers/garmentsController')

const router = Router()

router.post('/', upload.single('image'), uploadGarment)
router.get('/', listGarments)
router.get('/images/:filename', getImage)
router.get('/:id', getGarment)
router.patch('/:id/override', overrideClassification)
router.patch('/:id/complete', completeGarment)

module.exports = router
