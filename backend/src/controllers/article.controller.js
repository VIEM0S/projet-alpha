const db = require('../config/db');

// GET /api/articles
const lister = async (req, res, next) => {
  try {
    const { search, categorie_id, actif } = req.query;
    const isResponsable = req.user.role === 'RESPONSABLE';

    let query = `
      SELECT
        a.id, a.reference, a.nom, a.description, a.unite_mesure,
        a.prix_vente_public,
        ${isResponsable ? 'a.prix_achat,' : ''}
        a.stock_actuel, a.seuil_alerte, a.actif,
        c.nom AS categorie_nom, c.id AS categorie_id,
        a.created_at, a.updated_at
      FROM articles a
      JOIN categories c ON a.categorie_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.nom ILIKE $${params.length} OR a.reference ILIKE $${params.length})`;
    }
    if (categorie_id) {
      params.push(categorie_id);
      query += ` AND a.categorie_id = $${params.length}`;
    }
    if (actif !== undefined) {
      params.push(actif === 'true');
      query += ` AND a.actif = $${params.length}`;
    }

    query += ' ORDER BY a.nom';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/articles/:id
const getById = async (req, res, next) => {
  try {
    const isResponsable = req.user.role === 'RESPONSABLE';
    const { rows } = await db.query(
      `SELECT a.*, c.nom AS categorie_nom
       ${isResponsable ? '' : ', NULL AS prix_achat'}
       FROM articles a
       JOIN categories c ON a.categorie_id = c.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Article introuvable' });
    const article = rows[0];
    if (!isResponsable) delete article.prix_achat;
    res.json(article);
  } catch (err) {
    next(err);
  }
};

// POST /api/articles
const creer = async (req, res, next) => {
  try {
    const { reference, nom, description, categorie_id, unite_mesure,
            prix_vente_public, prix_achat, seuil_alerte } = req.body;

    if (!reference || !nom || !categorie_id || !unite_mesure ||
        prix_vente_public === undefined || prix_achat === undefined) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    const { rows } = await db.query(
      `INSERT INTO articles
         (reference, nom, description, categorie_id, unite_mesure,
          prix_vente_public, prix_achat, seuil_alerte, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [reference, nom, description || null, categorie_id, unite_mesure,
       prix_vente_public, prix_achat, seuil_alerte || 0, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/articles/:id
const modifier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isResponsable = req.user.role === 'RESPONSABLE';
    const { nom, description, categorie_id, unite_mesure,
            prix_vente_public, prix_achat, seuil_alerte } = req.body;

    // Prix achat modifiable uniquement par le responsable
    const prixAchatUpdate = isResponsable ? prix_achat : undefined;

    const { rows } = await db.query(
      `UPDATE articles SET
        nom = COALESCE($1, nom),
        description = COALESCE($2, description),
        categorie_id = COALESCE($3, categorie_id),
        unite_mesure = COALESCE($4, unite_mesure),
        prix_vente_public = COALESCE($5, prix_vente_public),
        prix_achat = COALESCE($6, prix_achat),
        seuil_alerte = COALESCE($7, seuil_alerte)
       WHERE id = $8
       RETURNING *`,
      [nom, description, categorie_id, unite_mesure,
       prix_vente_public, prixAchatUpdate, seuil_alerte, id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Article introuvable' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/articles/:id/actif
const toggleActif = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérifier qu'aucun mouvement n'existe avant désactivation
    const { rows: mvts } = await db.query(
      'SELECT id FROM mouvements_stock WHERE article_id = $1 LIMIT 1', [id]
    );

    const { rows } = await db.query(
      'UPDATE articles SET actif = NOT actif WHERE id = $1 RETURNING id, nom, actif',
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Article introuvable' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/articles/:id
const supprimer = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Bloquer si des mouvements ou ventes existent
    const { rows: check } = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM mouvements_stock WHERE article_id = $1) AS nb_mvt,
        (SELECT COUNT(*) FROM lignes_vente WHERE article_id = $1) AS nb_ventes`,
      [id]
    );

    if (parseInt(check[0].nb_mvt) > 0 || parseInt(check[0].nb_ventes) > 0) {
      return res.status(409).json({
        message: 'Impossible de supprimer : des mouvements ou ventes existent pour cet article. Désactivez-le à la place.'
      });
    }

    const { rows } = await db.query('DELETE FROM articles WHERE id = $1 RETURNING id', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Article introuvable' });
    res.json({ message: 'Article supprimé' });
  } catch (err) {
    next(err);
  }
};

module.exports = { lister, getById, creer, modifier, toggleActif, supprimer };
