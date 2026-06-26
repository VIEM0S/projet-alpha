require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');

const authRoutes       = require('./routes/auth.routes');
const categorieRoutes  = require('./routes/categorie.routes');
const articleRoutes    = require('./routes/article.routes');
const clientRoutes     = require('./routes/client.routes');
const stockRoutes      = require('./routes/stock.routes');
const venteRoutes      = require('./routes/vente.routes');
const devisRoutes      = require('./routes/devis.routes');
const creditRoutes     = require('./routes/credit.routes');
const dashboardRoutes  = require('./routes/dashboard.routes');
const alerteRoutes     = require('./routes/alerte.routes');

const { errorHandler } = require('./middleware/error.middleware');
const { demarrerJobs }  = require('./services/jobs.service');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Sécurité & middleware globaux ──────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes API ─────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/categories',  categorieRoutes);
app.use('/api/articles',    articleRoutes);
app.use('/api/clients',     clientRoutes);
app.use('/api/stocks',      stockRoutes);
app.use('/api/ventes',      venteRoutes);
app.use('/api/devis',       devisRoutes);
app.use('/api/credits',     creditRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/alertes',     alerteRoutes);

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── Gestion des erreurs globale ────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  demarrerJobs();
});

module.exports = app;
