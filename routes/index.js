const express = require('express');
const router = express.Router();

// Dashboard route
router.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.user,
    activePage: 'dashboard'
  });
});

module.exports = router;