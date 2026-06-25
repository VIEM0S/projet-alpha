const db = require('../config/db');

// POST /api/ventes
const creerVente = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { client_id, lignes, mode_paiement,
            montant_especes = 0, montant_mobile = 0, montant_credit = 0,
            devis_id = null } = req.body;

    if (!lignes?.length) {
      return res.status(400).json({ message: 'Au moins une ligne de vente est requise' });
    }
    if (!['ESPECES', 'MOBILE_MONEY', 'CREDIT', 'MIXTE'].includes(mode_paiement)) {
      return res.status(400).json({ message: 'Mode de paiement invalide' });
    }

    let total = 0;
    const lignesValidees = [];

    for (const ligne of lignes) {
      const { article_id, quantite, prix_unitaire, note_modification } = ligne;

      if (!article_id || !quantite || quantite <= 0) {
        throw { status: 400, message: 'Données de ligne invalides' };
      }

      // Verrou optimiste sur le stock
      const { rows: art } = await client.query(
        'SELECT id, stock_actuel, prix_vente_public, nom FROM articles WHERE id = $1 AND actif = TRUE FOR UPDATE',
        [article_id]
      );
      if (!art.length) throw { status: 404, message: `Article ${article_id} introuvable` };

      if (parseFloat(art[0].stock_actuel) < parseFloat(quantite)) {
        throw {
          status: 409,
          message: `Stock insuffisant pour "${art[0].nom}" : ${art[0].stock_actuel} disponible`
        };
      }

      // Vérifier prix négocié si client connu
      let prixApplique = prix_unitaire !== undefined ? prix_unitaire : art[0].prix_vente_public;
      const prixModifie = prix_unitaire !== undefined && parseFloat(prix_unitaire) !== parseFloat(art[0].prix_vente_public);

      if (prixModifie && !note_modification?.trim()) {
        throw { status: 400, message: `Note obligatoire si prix modifié (article : ${art[0].nom})` };
      }

      if (client_id && !prixModifie) {
        const { rows: pn } = await client.query(
          `SELECT prix FROM prix_negocies
           WHERE client_id = $1 AND article_id = $2 LIMIT 1`,
          [client_id, article_id]
        );
        if (pn.length) prixApplique = pn[0].prix;
        else {
          // Chercher prix par catégorie
          const { rows: pnCat } = await client.query(
            `SELECT pn.prix FROM prix_negocies pn
             JOIN articles a ON a.categorie_id = pn.categorie_id
             WHERE pn.client_id = $1 AND a.id = $2 LIMIT 1`,
            [client_id, article_id]
          );
          if (pnCat.length) prixApplique = pnCat[0].prix;
        }
      }

      const sousTotal = parseFloat(prixApplique) * parseFloat(quantite);
      total += sousTotal;

      lignesValidees.push({
        article_id, quantite, prix_unitaire: prixApplique,
        prix_modifie: prixModifie, note_modification,
        sous_total: sousTotal, stock_actuel: art[0].stock_actuel,
        nom: art[0].nom
      });
    }

    // Créer la vente
    const { rows: venteRows } = await client.query(
      `INSERT INTO ventes
         (client_id, total, mode_paiement, montant_especes, montant_mobile,
          montant_credit, gestionnaire_id, devis_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [client_id || null, total, mode_paiement, montant_especes,
       montant_mobile, montant_credit, req.user.id, devis_id]
    );
    const vente = venteRows[0];

    // Insérer les lignes et mettre à jour le stock
    for (const ligne of lignesValidees) {
      await client.query(
        `INSERT INTO lignes_vente
           (vente_id, article_id, quantite, prix_unitaire, prix_modifie, note_modification, sous_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [vente.id, ligne.article_id, ligne.quantite, ligne.prix_unitaire,
         ligne.prix_modifie, ligne.note_modification || null, ligne.sous_total]
      );

      const nouveauStock = parseFloat(ligne.stock_actuel) - parseFloat(ligne.quantite);
      await client.query('UPDATE articles SET stock_actuel = $1 WHERE id = $2', [nouveauStock, ligne.article_id]);

      await client.query(
        `INSERT INTO mouvements_stock
           (article_id, type, quantite, stock_avant, stock_apres, reference_doc, gestionnaire_id)
         VALUES ($1,'SORTIE',$2,$3,$4,$5,$6)`,
        [ligne.article_id, -ligne.quantite, ligne.stock_actuel, nouveauStock, vente.id, req.user.id]
      );
    }

    // Créer le crédit si besoin
    if ((mode_paiement === 'CREDIT' || mode_paiement === 'MIXTE') && montant_credit > 0) {
      const { date_echeance } = req.body;
      if (!date_echeance) throw { status: 400, message: 'Date d\'échéance requise pour un crédit' };
      if (!client_id) throw { status: 400, message: 'Client requis pour une vente à crédit' };

      await client.query(
        `INSERT INTO credits
           (vente_id, client_id, montant_total, acompte, solde, date_echeance, gestionnaire_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [vente.id, client_id, montant_credit, montant_especes + montant_mobile,
         montant_credit, date_echeance, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ...vente, lignes: lignesValidees });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/ventes
const lister = async (req, res, next) => {
  try {
    const { client_id, gestionnaire_id, debut, fin, statut } = req.query;
    let query = `
      SELECT v.*, c.nom AS client_nom,
             u.nom AS gestionnaire_nom, u.prenom AS gestionnaire_prenom,
             COUNT(lv.id) AS nb_articles
      FROM ventes v
      LEFT JOIN clients c ON v.client_id = c.id
      JOIN utilisateurs u ON v.gestionnaire_id = u.id
      LEFT JOIN lignes_vente lv ON v.id = lv.vente_id
      WHERE 1=1
    `;
    const params = [];

    if (client_id)      { params.push(client_id);      query += ` AND v.client_id = $${params.length}`; }
    if (gestionnaire_id){ params.push(gestionnaire_id); query += ` AND v.gestionnaire_id = $${params.length}`; }
    if (debut)          { params.push(debut);           query += ` AND v.created_at >= $${params.length}`; }
    if (fin)            { params.push(fin);             query += ` AND v.created_at <= $${params.length}`; }
    if (statut)         { params.push(statut);          query += ` AND v.statut = $${params.length}`; }

    query += ' GROUP BY v.id, c.nom, u.nom, u.prenom ORDER BY v.created_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/ventes/:id
const getById = async (req, res, next) => {
  try {
    const { rows: vente } = await db.query(
      `SELECT v.*, c.nom AS client_nom, u.nom AS gestionnaire_nom
       FROM ventes v
       LEFT JOIN clients c ON v.client_id = c.id
       JOIN utilisateurs u ON v.gestionnaire_id = u.id
       WHERE v.id = $1`,
      [req.params.id]
    );
    if (!vente.length) return res.status(404).json({ message: 'Vente introuvable' });

    const { rows: lignes } = await db.query(
      `SELECT lv.*, a.nom AS article_nom, a.unite_mesure, a.reference
       FROM lignes_vente lv
       JOIN articles a ON lv.article_id = a.id
       WHERE lv.vente_id = $1`,
      [req.params.id]
    );

    res.json({ ...vente[0], lignes });
  } catch (err) {
    next(err);
  }
};

// POST /api/ventes/:id/annuler
const annulerVente = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { motif } = req.body;

    if (!motif?.trim()) {
      return res.status(400).json({ message: 'Motif d\'annulation obligatoire' });
    }

    const { rows: vente } = await client.query(
      'SELECT * FROM ventes WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!vente.length) return res.status(404).json({ message: 'Vente introuvable' });
    if (vente[0].statut === 'ANNULEE') {
      return res.status(409).json({ message: 'Cette vente est déjà annulée' });
    }

    // Vérifier délai 24h
    const diff = (Date.now() - new Date(vente[0].created_at).getTime()) / 3600000;
    if (diff > 24) {
      return res.status(409).json({ message: 'Annulation impossible après 24 heures' });
    }

    // Réintégrer le stock
    const { rows: lignes } = await client.query(
      'SELECT * FROM lignes_vente WHERE vente_id = $1',
      [id]
    );
    for (const ligne of lignes) {
      const { rows: art } = await client.query(
        'SELECT stock_actuel FROM articles WHERE id = $1 FOR UPDATE',
        [ligne.article_id]
      );
      const nouveauStock = parseFloat(art[0].stock_actuel) + parseFloat(ligne.quantite);
      await client.query('UPDATE articles SET stock_actuel = $1 WHERE id = $2', [nouveauStock, ligne.article_id]);
      await client.query(
        `INSERT INTO mouvements_stock
           (article_id, type, quantite, stock_avant, stock_apres, motif, reference_doc, gestionnaire_id)
         VALUES ($1,'ENTREE',$2,$3,$4,$5,$6,$7)`,
        [ligne.article_id, ligne.quantite, art[0].stock_actuel, nouveauStock,
         `Annulation vente ${id}`, id, req.user.id]
      );
    }

    // Marquer la vente annulée
    const { rows: updated } = await client.query(
      `UPDATE ventes SET statut='ANNULEE', motif_annulation=$1, annulee_par=$2, annulee_at=NOW()
       WHERE id = $3 RETURNING *`,
      [motif.trim(), req.user.id, id]
    );

    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { creerVente, lister, getById, annulerVente };
