const db = require('../config/db');

// GET /api/dashboard  (responsable uniquement)
const getDashboard = async (req, res, next) => {
  try {
    const { debut, fin } = req.query;
    const dateDebut = debut || new Date(new Date().setHours(0,0,0,0)).toISOString();
    const dateFin   = fin   || new Date(new Date().setHours(23,59,59,999)).toISOString();

    // CA sur la période
    const { rows: ca } = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS ca_total,
              COUNT(*) AS nb_ventes
       FROM ventes
       WHERE statut = 'CONFIRMEE' AND created_at BETWEEN $1 AND $2`,
      [dateDebut, dateFin]
    );

    // CA du jour
    const { rows: caJour } = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS ca_jour FROM ventes
       WHERE statut = 'CONFIRMEE' AND created_at::date = CURRENT_DATE`
    );

    // CA du mois
    const { rows: caMois } = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS ca_mois FROM ventes
       WHERE statut = 'CONFIRMEE'
         AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`
    );

    // Marge globale (prix vente - prix achat) sur la période
    const { rows: marge } = await db.query(
      `SELECT COALESCE(SUM(lv.sous_total - (lv.quantite * a.prix_achat)), 0) AS marge_totale
       FROM lignes_vente lv
       JOIN articles a ON lv.article_id = a.id
       JOIN ventes v ON lv.vente_id = v.id
       WHERE v.statut = 'CONFIRMEE' AND v.created_at BETWEEN $1 AND $2`,
      [dateDebut, dateFin]
    );

    // Valeur du stock
    const { rows: valeurStock } = await db.query(
      `SELECT COALESCE(SUM(stock_actuel * prix_achat), 0) AS valeur_stock FROM articles WHERE actif = TRUE`
    );

    // Alertes actives
    const { rows: alertes } = await db.query(
      `SELECT a.*, art.nom AS article_nom, art.stock_actuel, art.unite_mesure
       FROM alertes a
       JOIN articles art ON a.article_id = art.id
       WHERE a.lue = FALSE ORDER BY a.created_at DESC`
    );

    // Crédits en cours
    const { rows: credits } = await db.query(
      `SELECT cr.*, c.nom AS client_nom
       FROM credits cr JOIN clients c ON cr.client_id = c.id
       WHERE cr.statut = 'EN_COURS'
       ORDER BY cr.date_echeance ASC LIMIT 10`
    );

    // Top 10 articles les plus vendus sur la période
    const { rows: topArticles } = await db.query(
      `SELECT a.id, a.nom, a.unite_mesure,
              SUM(lv.quantite) AS qte_vendue,
              SUM(lv.sous_total) AS ca,
              SUM(lv.sous_total - lv.quantite * a.prix_achat) AS marge
       FROM lignes_vente lv
       JOIN articles a ON lv.article_id = a.id
       JOIN ventes v ON lv.vente_id = v.id
       WHERE v.statut = 'CONFIRMEE' AND v.created_at BETWEEN $1 AND $2
       GROUP BY a.id, a.nom, a.unite_mesure
       ORDER BY qte_vendue DESC LIMIT 10`,
      [dateDebut, dateFin]
    );

    // Marge par catégorie
    const { rows: margeCategorie } = await db.query(
      `SELECT c.nom AS categorie,
              SUM(lv.sous_total) AS ca,
              SUM(lv.sous_total - lv.quantite * a.prix_achat) AS marge
       FROM lignes_vente lv
       JOIN articles a ON lv.article_id = a.id
       JOIN categories c ON a.categorie_id = c.id
       JOIN ventes v ON lv.vente_id = v.id
       WHERE v.statut = 'CONFIRMEE' AND v.created_at BETWEEN $1 AND $2
       GROUP BY c.nom ORDER BY marge DESC`,
      [dateDebut, dateFin]
    );

    // Performance par gestionnaire
    const { rows: gestionnaires } = await db.query(
      `SELECT u.id, u.nom, u.prenom,
              COUNT(v.id) AS nb_ventes,
              COALESCE(SUM(v.total), 0) AS total_ventes
       FROM utilisateurs u
       LEFT JOIN ventes v ON v.gestionnaire_id = u.id
         AND v.statut = 'CONFIRMEE' AND v.created_at BETWEEN $1 AND $2
       WHERE u.role = 'GESTIONNAIRE' AND u.actif = TRUE
       GROUP BY u.id, u.nom, u.prenom ORDER BY total_ventes DESC`,
      [dateDebut, dateFin]
    );

    res.json({
      periode: { debut: dateDebut, fin: dateFin },
      ca: {
        total: parseFloat(ca[0].ca_total),
        nb_ventes: parseInt(ca[0].nb_ventes),
        jour: parseFloat(caJour[0].ca_jour),
        mois: parseFloat(caMois[0].ca_mois),
      },
      marge: {
        totale: parseFloat(marge[0].marge_totale),
        par_categorie: margeCategorie,
      },
      stock: {
        valeur_totale: parseFloat(valeurStock[0].valeur_stock),
        alertes,
      },
      credits_en_cours: credits,
      top_articles: topArticles,
      gestionnaires,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
