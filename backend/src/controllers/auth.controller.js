const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { login, mot_de_passe } = req.body;

    if (!login || !mot_de_passe) {
      return res.status(400).json({ message: 'Login et mot de passe requis' });
    }

    const { rows } = await db.query(
      'SELECT * FROM utilisateurs WHERE login = $1 AND actif = TRUE',
      [login.trim().toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);

    if (!valid) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: {
        id:     user.id,
        nom:    user.nom,
        prenom: user.prenom,
        login:  user.login,
        role:   user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  res.json({ user: req.user });
};

// POST /api/auth/utilisateurs  (responsable uniquement)
const creerUtilisateur = async (req, res, next) => {
  try {
    const { nom, prenom, login, mot_de_passe, role } = req.body;

    if (!nom || !prenom || !login || !mot_de_passe || !role) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }
    if (!['RESPONSABLE', 'GESTIONNAIRE'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    const hash = await bcrypt.hash(mot_de_passe, 12);

    const { rows } = await db.query(
      `INSERT INTO utilisateurs (nom, prenom, login, mot_de_passe, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nom, prenom, login, role, actif, created_at`,
      [nom, prenom, login.trim().toLowerCase(), hash, role]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/utilisateurs  (responsable uniquement)
const listerUtilisateurs = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nom, prenom, login, role, actif, created_at FROM utilisateurs ORDER BY nom'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/auth/utilisateurs/:id/actif  (responsable uniquement)
const toggleActif = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `UPDATE utilisateurs SET actif = NOT actif
       WHERE id = $1
       RETURNING id, nom, prenom, login, role, actif`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};



// PATCH /api/auth/mot-de-passe
const changerMotDePasse = async (req, res, next) => {
  try {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
    if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
      return res.status(400).json({ message: 'Ancien et nouveau mot de passe requis' });
    }
    if (nouveau_mot_de_passe.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }
    const { rows } = await db.query('SELECT mot_de_passe FROM utilisateurs WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(ancien_mot_de_passe, rows[0].mot_de_passe);
    if (!valid) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    const hash = await bcrypt.hash(nouveau_mot_de_passe, 12);
    await db.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) { next(err); }
};

module.exports = { login, me, creerUtilisateur, listerUtilisateurs, toggleActif, changerMotDePasse };
