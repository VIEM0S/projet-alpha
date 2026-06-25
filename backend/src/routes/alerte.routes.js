const router = require('express').Router();
const ctrl   = require('../controllers/alerte.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/',               authenticate, ctrl.lister);
router.patch('/:id/lue',      authenticate, ctrl.marquerLue);
router.patch('/toutes/lues',  authenticate, ctrl.marquerToutesLues);

module.exports = router;
