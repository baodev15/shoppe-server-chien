const express = require('express');
const router = express.Router();
const productController = require('../../controllers/product.controller');

// Existing routes
router.post('/', productController.createProduct);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.post('/admin', productController.addForAdmin);

// New import routes
router.post('/import', productController.importProducts);

module.exports = router;