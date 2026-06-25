const router = require('express').Router();
const ctrl   = require('../controllers/dashboard.controller');
const { authenticate, requireResponsable } = require('../middleware/auth.middleware');

router.get('/', authenticate, requireResponsable, ctrl.getDashboard);

module.exports = router;
