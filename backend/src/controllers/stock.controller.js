const db = require('../config/db');

// POST /api/stocks/entree
const entreeStock = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { article_id, quantite, prix_achat, fournisseur_id } = req.body;

    if (!article_id || !quantite || quantite <= 0) {
      return res.status(400).json({ message: 'Article et quantité (> 0) requis' });
    }

    // Récupérer stock actuel avec verrou
    const { rows: art } = await client.query(
      'SELECT id, stock_actuel, nom FROM articles WHERE id = $1 AND actif = TRUE FOR UPDATE',
      [article_id]
    );
    if (!art.length) return res.status(404).json({ message: 'Article introuvable ou inactif' });

    const stockAvant = parseFloat(art[0].stock_actuel);
    const stockApres = stockAvant + parseFloat(quantite);

    // Mettre à jour le stock
    await client.query(
      'UPDATE articles SET stock_actuel = $1 WHERE id = $2',
      [stockApres, article_id]
    );

    // Enregistrer le mouvement
    const { rows } = await client.query(
      `INSERT INTO mouvements_stock
         (article_id, type, quantite, stock_avant, stock_apres, prix_achat, fournisseur_id, gestionnaire_id)
       VALUES ($1, 'ENTREE', $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [article_id, quantite, stockAvant, stockApres,
       prix_achat || null, fournisseur_id || null, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ mouvement: rows[0], stock_actuel: stockApres });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// POST /api/stocks/ajustement
const ajustementStock = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { article_id, nouvelle_quantite, motif } = req.body;

    if (!article_id || nouvelle_quantite === undefined || !motif?.trim()) {
      return res.status(400).json({ message: 'Article, nouvelle quantité et motif sont requis' });
    }
    if (parseFloat(nouvelle_quantite) < 0) {
      return res.status(400).json({ message: 'La quantité ne peut pas être négative' });
    }

    const { rows: art } = await client.query(
      'SELECT stock_actuel FROM articles WHERE id = $1 FOR UPDATE',
      [article_id]
    );
    if (!art.length) return res.status(404).json({ message: 'Article introuvable' });

    const stockAvant = parseFloat(art[0].stock_actuel);
    const stockApres = parseFloat(nouvelle_quantite);
    const delta      = stockApres - stockAvant;

    await client.query('UPDATE articles SET stock_actuel = $1 WHERE id = $2', [stockApres, article_id]);

    const { rows } = await client.query(
      `INSERT INTO mouvements_stock
         (article_id, type, quantite, stock_avant, stock_apres, motif, gestionnaire_id)
       VALUES ($1, 'AJUSTEMENT', $2, $3, $4, $5, $6)
       RETURNING *`,
      [article_id, delta, stockAvant, stockApres, motif.trim(), req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ mouvement: rows[0], stock_actuel: stockApres });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/stocks/historique/:article_id
const historique = async (req, res, next) => {
  try {
    const { article_id } = req.params;
    const { debut, fin } = req.query;

    let query = `
      SELECT m.*, u.nom AS gestionnaire_nom, u.prenom AS gestionnaire_prenom,
             f.nom AS fournisseur_nom
      FROM mouvements_stock m
      JOIN utilisateurs u ON m.gestionnaire_id = u.id
      LEFT JOIN fournisseurs f ON m.fournisseur_id = f.id
      WHERE m.article_id = $1
    `;
    const params = [article_id];

    if (debut) { params.push(debut); query += ` AND m.created_at >= $${params.length}`; }
    if (fin)   { params.push(fin);   query += ` AND m.created_at <= $${params.length}`; }

    query += ' ORDER BY m.created_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/stocks/alertes
const alertesStock = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, art.nom AS article_nom, art.stock_actuel, art.seuil_alerte, art.unite_mesure
       FROM alertes a
       JOIN articles art ON a.article_id = art.id
       WHERE a.type IN ('STOCK_BAS','RUPTURE') AND a.lue = FALSE
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { entreeStock, ajustementStock, historique, alertesStock };
