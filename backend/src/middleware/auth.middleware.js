const jwt = require('jsonwebtoken');
const db  = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token manquant ou invalide' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier que l'utilisateur existe et est actif
    const { rows } = await db.query(
      'SELECT id, nom, prenom, login, role, actif FROM utilisateurs WHERE id = $1',
      [decoded.id]
    );

    if (!rows.length || !rows[0].actif) {
      return res.status(401).json({ message: 'Compte inactif ou introuvable' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expirée, veuillez vous reconnecter' });
    }
    return res.status(401).json({ message: 'Token invalide' });
  }
};

// Middleware rôle RESPONSABLE uniquement
const requireResponsable = (req, res, next) => {
  if (req.user.role !== 'RESPONSABLE') {
    return res.status(403).json({ message: 'Accès réservé au responsable' });
  }
  next();
};

module.exports = { authenticate, requireResponsable };
