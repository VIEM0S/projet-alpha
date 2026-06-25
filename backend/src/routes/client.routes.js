const router = require('express').Router();
const ctrl   = require('../controllers/client.controller');
const { authenticate, requireResponsable } = require('../middleware/auth.middleware');

router.get('/',                    authenticate, ctrl.lister);
router.get('/:id',                 authenticate, ctrl.getById);
router.get('/:id/historique',      authenticate, ctrl.historique);
router.post('/',                   authenticate, ctrl.creer);
router.put('/:id',                 authenticate, ctrl.modifier);
router.post('/:id/prix-negocies',  authenticate, requireResponsable, ctrl.definirPrixNegocie);
router.delete('/:id/prix-negocies/:pnId', authenticate, requireResponsable, ctrl.supprimerPrixNegocie);

module.exports = router;
