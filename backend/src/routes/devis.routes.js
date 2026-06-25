const router = require('express').Router();
const ctrl   = require('../controllers/devis.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/',              authenticate, ctrl.lister);
router.get('/:id',           authenticate, ctrl.getById);
router.post('/',             authenticate, ctrl.creer);
router.patch('/:id/statut',  authenticate, ctrl.changerStatut);
router.post('/:id/convertir',authenticate, ctrl.convertir);

module.exports = router;
