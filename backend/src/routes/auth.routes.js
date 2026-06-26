const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { authenticate, requireResponsable } = require('../middleware/auth.middleware');

router.post('/login',                   ctrl.login);
router.get('/me',                       authenticate, ctrl.me);
router.patch('/mot-de-passe',           authenticate, ctrl.changerMotDePasse);
router.post('/utilisateurs',            authenticate, requireResponsable, ctrl.creerUtilisateur);
router.get('/utilisateurs',             authenticate, requireResponsable, ctrl.listerUtilisateurs);
router.patch('/utilisateurs/:id/actif', authenticate, requireResponsable, ctrl.toggleActif);

module.exports = router;
