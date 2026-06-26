const db = require('../config/db');

// ── Job 1 : Expirer les devis dont la date de validité est dépassée
const expirerDevis = async () => {
  try {
    const { rowCount } = await db.query(
      `UPDATE devis SET statut = 'EXPIRE'
       WHERE statut = 'EN_ATTENTE'
         AND date_validite < CURRENT_DATE`
    );
    if (rowCount > 0) {
      console.log(`[JOBS] ${rowCount} devis expirés`);
    }
  } catch (err) {
    console.error('[JOBS] Erreur expiration devis :', err.message);
  }
};

// ── Job 2 : Créer les alertes de rappel pour les crédits à échéance dans 48h
const rappelCredits = async () => {
  try {
    const { rows: credits } = await db.query(
      `SELECT cr.id, cr.client_id, cr.solde, cr.date_echeance, c.nom AS client_nom
       FROM credits cr
       JOIN clients c ON cr.client_id = c.id
       WHERE cr.statut = 'EN_COURS'
         AND cr.date_echeance BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'`
    );

    for (const credit of credits) {
      // Vérifier qu'une alerte n'existe pas déjà pour ce crédit aujourd'hui
      const { rows: existing } = await db.query(
        `SELECT id FROM alertes
         WHERE credit_id = $1
           AND type = 'RAPPEL_CREDIT'
           AND created_at::date = CURRENT_DATE`,
        [credit.id]
      );

      if (!existing.length) {
        await db.query(
          `INSERT INTO alertes (type, credit_id, message)
           VALUES ('RAPPEL_CREDIT', $1, $2)`,
          [
            credit.id,
            `Crédit de ${credit.client_nom} arrive à échéance le ${new Date(credit.date_echeance).toLocaleDateString('fr-FR')} — Solde : ${Number(credit.solde).toLocaleString('fr-FR')} FCFA`
          ]
        );
      }
    }

    if (credits.length > 0) {
      console.log(`[JOBS] ${credits.length} rappel(s) crédit générés`);
    }
  } catch (err) {
    console.error('[JOBS] Erreur rappels crédits :', err.message);
  }
};

// ── Job 3 : Marquer les crédits en retard
const marquerCreditsEnRetard = async () => {
  try {
    const { rowCount } = await db.query(
      `UPDATE credits SET statut = 'EN_RETARD'
       WHERE statut = 'EN_COURS'
         AND date_echeance < CURRENT_DATE
         AND solde > 0`
    );
    if (rowCount > 0) {
      console.log(`[JOBS] ${rowCount} crédit(s) marqués en retard`);
    }
  } catch (err) {
    console.error('[JOBS] Erreur marquage crédits en retard :', err.message);
  }
};

// ── Planification simple (sans dépendance externe)
const demarrerJobs = () => {
  const MINUTE = 60 * 1000;
  const HEURE  = 60 * MINUTE;

  // Exécution immédiate au démarrage
  expirerDevis();
  rappelCredits();
  marquerCreditsEnRetard();

  // Ensuite toutes les heures
  setInterval(async () => {
    await expirerDevis();
    await rappelCredits();
    await marquerCreditsEnRetard();
  }, HEURE);

  console.log('⏰ Jobs automatiques démarrés (toutes les heures)');
};

module.exports = { demarrerJobs, expirerDevis, rappelCredits, marquerCreditsEnRetard };
