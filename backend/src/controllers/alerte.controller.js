const db = require('../config/db');

const lister = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, art.nom AS article_nom, art.stock_actuel, art.unite_mesure
       FROM alertes a
       LEFT JOIN articles art ON a.article_id = art.id
       WHERE a.lue = FALSE
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const marquerLue = async (req, res, next) => {
  try {
    await db.query('UPDATE alertes SET lue = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Alerte marquée comme lue' });
  } catch (err) { next(err); }
};

const marquerToutesLues = async (req, res, next) => {
  try {
    await db.query('UPDATE alertes SET lue = TRUE WHERE lue = FALSE');
    res.json({ message: 'Toutes les alertes marquées comme lues' });
  } catch (err) { next(err); }
};

module.exports = { lister, marquerLue, marquerToutesLues };
