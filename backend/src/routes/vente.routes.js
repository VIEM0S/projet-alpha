const router = require('express').Router();
const ctrl   = require('../controllers/vente.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/',          authenticate, ctrl.lister);
router.get('/:id',       authenticate, ctrl.getById);
router.post('/',         authenticate, ctrl.creerVente);
router.post('/:id/annuler', authenticate, ctrl.annulerVente);

module.exports = router;
