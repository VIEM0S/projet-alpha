const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERREUR:`, err.message);

  // Erreur de validation express-validator
  if (err.type === 'validation') {
    return res.status(422).json({ message: 'Données invalides', errors: err.errors });
  }

  // Erreur PostgreSQL
  if (err.code) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Cette valeur existe déjà (doublon)' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Référence invalide (enregistrement lié introuvable)' });
    }
    if (err.code === '23514') {
      return res.status(400).json({ message: 'Valeur hors des limites autorisées' });
    }
  }

  const status  = err.status || 500;
  const message = err.message || 'Erreur interne du serveur';
  res.status(status).json({ message });
};

const notFound = (req, res) => {
  res.status(404).json({ message: `Route introuvable : ${req.method} ${req.path}` });
};

module.exports = { errorHandler, notFound };
