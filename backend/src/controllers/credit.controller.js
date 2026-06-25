const db = require('../config/db');

// GET /api/credits
const lister = async (req, res, next) => {
  try {
    const { statut } = req.query;
    let query = `
      SELECT cr.*, c.nom AS client_nom, u.nom AS gestionnaire_nom
      FROM credits cr
      JOIN clients c ON cr.client_id = c.id
      JOIN utilisateurs u ON cr.gestionnaire_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (statut) { params.push(statut); query += ` AND cr.statut = $${params.length}`; }
    query += ' ORDER BY cr.date_echeance ASC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /api/credits/:id
const getById = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT cr.*, c.nom AS client_nom FROM credits cr
       JOIN clients c ON cr.client_id = c.id WHERE cr.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Crédit introuvable' });

    const { rows: versements } = await db.query(
      `SELECT v.*, u.nom AS gestionnaire_nom FROM versements v
       JOIN utilisateurs u ON v.gestionnaire_id = u.id
       WHERE v.credit_id = $1 ORDER BY v.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...rows[0], versements });
  } catch (err) { next(err); }
};

// POST /api/credits/:id/versement
const enregistrerVersement = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { montant } = req.body;
    if (!montant || parseFloat(montant) <= 0) {
      return res.status(400).json({ message: 'Montant invalide' });
    }

    const { rows: creditRows } = await client.query(
      'SELECT * FROM credits WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!creditRows.length) return res.status(404).json({ message: 'Crédit introuvable' });
    const credit = creditRows[0];

    if (credit.statut === 'SOLDE') {
      return res.status(409).json({ message: 'Ce crédit est déjà soldé' });
    }
    if (parseFloat(montant) > parseFloat(credit.solde)) {
      return res.status(400).json({ message: `Montant supérieur au solde restant (${credit.solde} FCFA)` });
    }

    const soldeBefore = parseFloat(credit.solde);
    const soldeApres  = soldeBefore - parseFloat(montant);

    // Enregistrer le versement
    const { rows: versement } = await client.query(
      `INSERT INTO versements (credit_id, montant, solde_avant, solde_apres, gestionnaire_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [credit.id, montant, soldeBefore, soldeApres, req.user.id]
    );

    // Mettre à jour le crédit
    const nouveauStatut = soldeApres === 0 ? 'SOLDE' : credit.statut;
    await client.query(
      'UPDATE credits SET solde = $1, statut = $2 WHERE id = $3',
      [soldeApres, nouveauStatut, credit.id]
    );

    await client.query('COMMIT');
    res.json({ versement: versement[0], solde_restant: soldeApres, statut: nouveauStatut });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/credits/echeances — crédits dont l'échéance est dans 48h
const echeancesProches = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT cr.*, c.nom AS client_nom, c.telephone AS client_telephone
       FROM credits cr
       JOIN clients c ON cr.client_id = c.id
       WHERE cr.statut = 'EN_COURS'
         AND cr.date_echeance BETWEEN NOW() AND NOW() + INTERVAL '2 days'
       ORDER BY cr.date_echeance ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

module.exports = { lister, getById, enregistrerVersement, echeancesProches };
