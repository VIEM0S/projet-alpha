const router = require('express').Router();
const ctrl   = require('../controllers/categorie.controller');
const { authenticate, requireResponsable } = require('../middleware/auth.middleware');

router.get('/',       authenticate,                      ctrl.lister);
router.post('/',      authenticate, requireResponsable,  ctrl.creer);
router.put('/:id',    authenticate, requireResponsable,  ctrl.modifier);
router.delete('/:id', authenticate, requireResponsable,  ctrl.supprimer);

module.exports = router;
