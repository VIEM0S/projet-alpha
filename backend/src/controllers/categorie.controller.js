const db = require('../config/db');

const lister = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, COUNT(a.id) AS nb_articles
       FROM categories c LEFT JOIN articles a ON a.categorie_id = c.id AND a.actif = TRUE
       GROUP BY c.id ORDER BY c.nom`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const creer = async (req, res, next) => {
  try {
    const { nom, description } = req.body;
    if (!nom) return res.status(400).json({ message: 'Nom requis' });
    const { rows } = await db.query(
      'INSERT INTO categories (nom, description) VALUES ($1,$2) RETURNING *',
      [nom, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

const modifier = async (req, res, next) => {
  try {
    const { nom, description } = req.body;
    const { rows } = await db.query(
      'UPDATE categories SET nom = COALESCE($1,nom), description = COALESCE($2,description) WHERE id = $3 RETURNING *',
      [nom, description, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Catégorie introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

const supprimer = async (req, res, next) => {
  try {
    const { rows: check } = await db.query(
      'SELECT COUNT(*) AS nb FROM articles WHERE categorie_id = $1', [req.params.id]
    );
    if (parseInt(check[0].nb) > 0) {
      return res.status(409).json({ message: 'Catégorie non vide — supprimez ou déplacez les articles d\'abord' });
    }
    await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Catégorie supprimée' });
  } catch (err) { next(err); }
};

module.exports = { lister, creer, modifier, supprimer };
