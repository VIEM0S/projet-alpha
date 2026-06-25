const router = require('express').Router();
const ctrl   = require('../controllers/credit.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/',                        authenticate, ctrl.lister);
router.get('/echeances',               authenticate, ctrl.echeancesProches);
router.get('/:id',                     authenticate, ctrl.getById);
router.post('/:id/versement',          authenticate, ctrl.enregistrerVersement);

module.exports = router;
