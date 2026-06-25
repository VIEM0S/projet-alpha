const db = require('../config/db');

const audit = (action, tableCible) => async (req, res, next) => {
  // On enveloppe res.json pour intercepter la réponse
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    // Enregistrer uniquement si succès (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      try {
        await db.query(
          `INSERT INTO audit_log (utilisateur_id, action, table_cible, enregistrement_id, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.id,
            action,
            tableCible,
            body?.id || body?.data?.id || null,
            JSON.stringify({ body: req.body, params: req.params }),
            req.ip,
          ]
        );
      } catch (e) {
        console.error('Audit log error:', e.message);
      }
    }
    return originalJson(body);
  };
  next();
};

module.exports = { audit };
