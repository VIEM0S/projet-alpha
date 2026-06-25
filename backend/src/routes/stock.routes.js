const router = require('express').Router();
const ctrl   = require('../controllers/stock.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/entree',                    authenticate, ctrl.entreeStock);
router.post('/ajustement',                authenticate, ctrl.ajustementStock);
router.get('/historique/:article_id',     authenticate, ctrl.historique);
router.get('/alertes',                    authenticate, ctrl.alertesStock);

module.exports = router;
