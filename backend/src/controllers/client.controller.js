const db = require('../config/db');

// GET /api/clients
const lister = async (req, res, next) => {
  try {
    const { search, type } = req.query;
    let query = `
      SELECT c.*,
        (SELECT COALESCE(SUM(cr.solde),0) FROM credits cr WHERE cr.client_id = c.id AND cr.statut = 'EN_COURS') AS solde_credit
      FROM clients c WHERE c.actif = TRUE
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.nom ILIKE $${params.length} OR c.telephone ILIKE $${params.length})`;
    }
    if (type) { params.push(type); query += ` AND c.type = $${params.length}`; }
    query += ' ORDER BY c.nom';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /api/clients/:id
const getById = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Client introuvable' });

    // Prix négociés
    const { rows: prixNeg } = await db.query(
      `SELECT pn.*, a.nom AS article_nom, cat.nom AS categorie_nom
       FROM prix_negocies pn
       LEFT JOIN articles a ON pn.article_id = a.id
       LEFT JOIN categories cat ON pn.categorie_id = cat.id
       WHERE pn.client_id = $1`,
      [req.params.id]
    );

    res.json({ ...rows[0], prix_negocies: prixNeg });
  } catch (err) { next(err); }
};

// GET /api/clients/:id/historique
const historique = async (req, res, next) => {
  try {
    const { rows: ventes } = await db.query(
      `SELECT v.id, v.total, v.mode_paiement, v.statut, v.created_at,
              COUNT(lv.id) AS nb_articles
       FROM ventes v
       LEFT JOIN lignes_vente lv ON v.id = lv.vente_id
       WHERE v.client_id = $1
       GROUP BY v.id ORDER BY v.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    const { rows: credits } = await db.query(
      'SELECT * FROM credits WHERE client_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    const { rows: devisListe } = await db.query(
      'SELECT id, total, statut, date_validite, created_at FROM devis WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.params.id]
    );
    res.json({ ventes, credits, devis: devisListe });
  } catch (err) { next(err); }
};

// POST /api/clients
const creer = async (req, res, next) => {
  try {
    const { nom, telephone, adresse, type } = req.body;
    if (!nom || !type) return res.status(400).json({ message: 'Nom et type requis' });
    if (!['PARTICULIER', 'PROFESSIONNEL'].includes(type)) {
      return res.status(400).json({ message: 'Type invalide' });
    }
    const { rows } = await db.query(
      'INSERT INTO clients (nom, telephone, adresse, type, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nom, telephone || null, adresse || null, type, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// PUT /api/clients/:id
const modifier = async (req, res, next) => {
  try {
    const { nom, telephone, adresse, type } = req.body;
    const { rows } = await db.query(
      `UPDATE clients SET
        nom = COALESCE($1, nom), telephone = COALESCE($2, telephone),
        adresse = COALESCE($3, adresse), type = COALESCE($4, type)
       WHERE id = $5 RETURNING *`,
      [nom, telephone, adresse, type, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Client introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// POST /api/clients/:id/prix-negocies  (responsable uniquement)
const definirPrixNegocie = async (req, res, next) => {
  try {
    const { article_id, categorie_id, prix } = req.body;
    if (prix === undefined || prix < 0) return res.status(400).json({ message: 'Prix invalide' });
    if (!article_id && !categorie_id) return res.status(400).json({ message: 'Article ou catégorie requis' });

    // Upsert
    const { rows } = await db.query(
      `INSERT INTO prix_negocies (client_id, article_id, categorie_id, prix, created_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT DO NOTHING RETURNING *`,
      [req.params.id, article_id || null, categorie_id || null, prix, req.user.id]
    );
    res.status(201).json(rows[0] || { message: 'Prix mis à jour' });
  } catch (err) { next(err); }
};

// DELETE /api/clients/:id/prix-negocies/:pnId  (responsable uniquement)
const supprimerPrixNegocie = async (req, res, next) => {
  try {
    await db.query('DELETE FROM prix_negocies WHERE id = $1 AND client_id = $2', [req.params.pnId, req.params.id]);
    res.json({ message: 'Prix négocié supprimé' });
  } catch (err) { next(err); }
};

module.exports = { lister, getById, historique, creer, modifier, definirPrixNegocie, supprimerPrixNegocie };
