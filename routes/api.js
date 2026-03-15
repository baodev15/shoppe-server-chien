const express = require('express');
const router = express.Router();
const shopeeAccountController = require('../controllers/shopeeAccount.controller');
const liveSessionController = require('../controllers/liveSession.controller');
const apiHeaderRouter = require('./apiHeader.routes');
const productRouter = require('./product.routes');
const commissionController = require('../controllers/commissionController');
const liveSessionsRouter = require('./api/liveSessions');
const xStatsigIdRouter = require('./api/xStatsigId.routes');
const licenseKeyController = require('../controllers/licenseKey.controller');
// API key middleware
const API_KEY = "Baole28372hd";
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.query.apiKey;
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ success: false, message: "Invalid API key" });
  }
  next();
};

// API route to insert Shopee account
router.post('/shopee-accounts', apiKeyAuth, shopeeAccountController.insertShopeeAccount);

// Live session routes
router.post('/live-sessions/start-live', apiKeyAuth, liveSessionController.startLive);
router.get('/live-sessions', apiKeyAuth, liveSessionController.getLiveSessions);
router.use('/api-headers', apiKeyAuth, apiHeaderRouter);
router.use('/products', apiKeyAuth, productRouter);
router.get('/licenses/check', apiKeyAuth, licenseKeyController.checkLicenseKey);
router.use('/x-statsig-ids', apiKeyAuth, xStatsigIdRouter);



// Add these routes to your existing api.js file
router.get('/commission/fetch-all', commissionController.fetchAllAccountsCommissionData);
router.get('/commission/stats', commissionController.getCommissionStats);
router.get('/commission/run-collection', commissionController.manualRunCollection);

// Live state routes
router.use('/live-sessions', apiKeyAuth, liveSessionsRouter);

module.exports = router;