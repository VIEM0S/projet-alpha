const router = require('express').Router();
const ctrl   = require('../controllers/article.controller');
const { authenticate, requireResponsable } = require('../middleware/auth.middleware');

router.get('/',           authenticate, ctrl.lister);
router.get('/:id',        authenticate, ctrl.getById);
router.post('/',          authenticate, ctrl.creer);
router.put('/:id',        authenticate, ctrl.modifier);
router.patch('/:id/actif',authenticate, ctrl.toggleActif);
router.delete('/:id',     authenticate, requireResponsable, ctrl.supprimer);

module.exports = router;
