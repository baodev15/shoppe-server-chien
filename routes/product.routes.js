const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

router.get('/add', productController.addForAdmin);
router.get('/check', productController.getForCheckInfo);
router.get('/info', productController.getProductInfo);
router.put('/info', productController.updateInfoProduct);
router.get('/create-video', productController.getForCreateVideo);
router.post('/create-video', productController.updateCreateVideo);
router.get('/upload-video', productController.getForUploadVideo);
router.post('/upload-video', productController.updateUploadVideo);

router.post('/', productController.createProduct);
router.get('/', productController.getAllProducts);

// Routes with ID parameter should be last to avoid conflicts
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
