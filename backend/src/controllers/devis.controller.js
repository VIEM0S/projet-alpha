const db = require('../config/db');

// POST /api/devis
const creer = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { client_id, lignes, date_validite, note, stock_reserve = false } = req.body;

    if (!client_id || !lignes?.length || !date_validite) {
      return res.status(400).json({ message: 'Client, lignes et date de validité requis' });
    }

    let total = 0;
    const lignesValidees = [];

    for (const ligne of lignes) {
      const { article_id, quantite, prix_unitaire } = ligne;
      const { rows: art } = await client.query(
        'SELECT id, nom, prix_vente_public, stock_actuel FROM articles WHERE id = $1 AND actif = TRUE',
        [article_id]
      );
      if (!art.length) throw { status: 404, message: `Article ${article_id} introuvable` };

      // Vérifier prix négocié
      let prix = prix_unitaire !== undefined ? prix_unitaire : art[0].prix_vente_public;
      const { rows: pn } = await client.query(
        'SELECT prix FROM prix_negocies WHERE client_id = $1 AND article_id = $2 LIMIT 1',
        [client_id, article_id]
      );
      if (pn.length && prix_unitaire === undefined) prix = pn[0].prix;

      const sousTotal = parseFloat(prix) * parseFloat(quantite);
      total += sousTotal;
      lignesValidees.push({ article_id, quantite, prix_unitaire: prix, sous_total: sousTotal });
    }

    const { rows: devisRows } = await client.query(
      `INSERT INTO devis (client_id, date_validite, total, note, stock_reserve, gestionnaire_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [client_id, date_validite, total, note || null, stock_reserve, req.user.id]
    );
    const devis = devisRows[0];

    for (const ligne of lignesValidees) {
      await client.query(
        'INSERT INTO lignes_devis (devis_id, article_id, quantite, prix_unitaire, sous_total) VALUES ($1,$2,$3,$4,$5)',
        [devis.id, ligne.article_id, ligne.quantite, ligne.prix_unitaire, ligne.sous_total]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ...devis, lignes: lignesValidees });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/devis
const lister = async (req, res, next) => {
  try {
    const { statut, client_id } = req.query;
    let query = `
      SELECT d.*, c.nom AS client_nom, u.nom AS gestionnaire_nom
      FROM devis d
      JOIN clients c ON d.client_id = c.id
      JOIN utilisateurs u ON d.gestionnaire_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (statut)    { params.push(statut);    query += ` AND d.statut = $${params.length}`; }
    if (client_id) { params.push(client_id); query += ` AND d.client_id = $${params.length}`; }
    query += ' ORDER BY d.created_at DESC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /api/devis/:id
const getById = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT d.*, c.nom AS client_nom FROM devis d JOIN clients c ON d.client_id = c.id WHERE d.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Devis introuvable' });

    const { rows: lignes } = await db.query(
      `SELECT ld.*, a.nom AS article_nom, a.unite_mesure FROM lignes_devis ld
       JOIN articles a ON ld.article_id = a.id WHERE ld.devis_id = $1`,
      [req.params.id]
    );
    res.json({ ...rows[0], lignes });
  } catch (err) { next(err); }
};

// PATCH /api/devis/:id/statut
const changerStatut = async (req, res, next) => {
  try {
    const { statut } = req.body;
    const valides = ['ACCEPTE', 'REFUSE'];
    if (!valides.includes(statut)) return res.status(400).json({ message: 'Statut invalide' });

    const { rows } = await db.query(
      `UPDATE devis SET statut = $1 WHERE id = $2 AND statut = 'EN_ATTENTE' RETURNING *`,
      [statut, req.params.id]
    );
    if (!rows.length) return res.status(409).json({ message: 'Devis introuvable ou déjà traité' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// POST /api/devis/:id/convertir
const convertir = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: devisRows } = await client.query(
      'SELECT * FROM devis WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!devisRows.length) return res.status(404).json({ message: 'Devis introuvable' });
    const devis = devisRows[0];

    if (!['EN_ATTENTE', 'ACCEPTE'].includes(devis.statut)) {
      return res.status(409).json({ message: `Impossible de convertir un devis en statut "${devis.statut}"` });
    }
    if (new Date(devis.date_validite) < new Date()) {
      return res.status(409).json({ message: 'Ce devis est expiré' });
    }

    const { rows: lignes } = await client.query(
      'SELECT * FROM lignes_devis WHERE devis_id = $1',
      [req.params.id]
    );

    // Vérifier le stock pour chaque article
    for (const ligne of lignes) {
      const { rows: art } = await client.query(
        'SELECT stock_actuel, nom FROM articles WHERE id = $1 FOR UPDATE',
        [ligne.article_id]
      );
      if (parseFloat(art[0].stock_actuel) < parseFloat(ligne.quantite)) {
        throw {
          status: 409,
          message: `Stock insuffisant pour "${art[0].nom}" : ${art[0].stock_actuel} disponible`
        };
      }
    }

    // Créer la vente via le controller vente en réutilisant la logique
    const { mode_paiement = 'ESPECES' } = req.body;
    const lignesVente = lignes.map(l => ({
      article_id: l.article_id, quantite: l.quantite, prix_unitaire: l.prix_unitaire
    }));

    // Insérer la vente
    const { rows: venteRows } = await client.query(
      'INSERT INTO ventes (client_id, total, mode_paiement, gestionnaire_id, devis_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [devis.client_id, devis.total, mode_paiement, req.user.id, devis.id]
    );
    const vente = venteRows[0];

    for (const ligne of lignes) {
      const { rows: art } = await client.query(
        'SELECT stock_actuel FROM articles WHERE id = $1', [ligne.article_id]
      );
      const stockAvant = parseFloat(art[0].stock_actuel);
      const stockApres = stockAvant - parseFloat(ligne.quantite);

      await client.query(
        'INSERT INTO lignes_vente (vente_id, article_id, quantite, prix_unitaire, sous_total) VALUES ($1,$2,$3,$4,$5)',
        [vente.id, ligne.article_id, ligne.quantite, ligne.prix_unitaire, ligne.sous_total]
      );
      await client.query('UPDATE articles SET stock_actuel = $1 WHERE id = $2', [stockApres, ligne.article_id]);
      await client.query(
        'INSERT INTO mouvements_stock (article_id, type, quantite, stock_avant, stock_apres, reference_doc, gestionnaire_id) VALUES ($1,\'SORTIE\',$2,$3,$4,$5,$6)',
        [ligne.article_id, -ligne.quantite, stockAvant, stockApres, vente.id, req.user.id]
      );
    }

    // Mettre à jour le devis
    await client.query(
      'UPDATE devis SET statut=\'CONVERTI\', vente_id=$1 WHERE id=$2',
      [vente.id, devis.id]
    );

    await client.query('COMMIT');
    res.json({ vente, message: 'Devis converti en vente avec succès' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { creer, lister, getById, changerStatut, convertir };
