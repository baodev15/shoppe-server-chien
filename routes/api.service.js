const express = require('express');
const router = express.Router();
const ApiServicesController = require('../controllers/api.services');
const jwt = require('jsonwebtoken');

const middleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7).trim()
            : '';
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'access_token is required'
            });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (!decoded || decoded.type !== 'video_upload_access') {
            return res.status(401).json({
                success: false,
                message: 'Invalid access_token type'
            });
        }

        req.tokenPayload = decoded;
        req.accessUsername = decoded.username || '';
        req.accessTeam = decoded.team || '';
        req.accessRole = decoded.role || '';
        console.log(req.accessUsername);
        console.log(req.accessTeam);
        console.log(req.accessRole);
        console.log(req.tokenPayload);
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired access_token'
        });
    }
};

router.get('/upload-video/get-accounts', middleware, ApiServicesController.getShopeeAccountsUpload);
router.get('/upload-video/get-account', middleware, ApiServicesController.getShopeeAccountUpload);
router.post('/upload-video/update-status', middleware, ApiServicesController.postShopeeAccountsUpload);

module.exports = router;
