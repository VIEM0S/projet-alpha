import api from './api';
import type {
  LoginResponse, Article, Categorie, Client, Vente,
  Devis, Credit, DashboardData, Alerte, MouvementStock, Utilisateur
} from '../types';

// ── Auth ──────────────────────────────────────────────────
export const authService = {
  login: (login: string, mot_de_passe: string) =>
    api.post<LoginResponse>('/auth/login', { login, mot_de_passe }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  creerUtilisateur: (data: object) => api.post<Utilisateur>('/auth/utilisateurs', data).then(r => r.data),
  listerUtilisateurs: () => api.get<Utilisateur[]>('/auth/utilisateurs').then(r => r.data),
  toggleActif: (id: string) => api.patch(`/auth/utilisateurs/${id}/actif`).then(r => r.data),
};

// ── Catégories ────────────────────────────────────────────
export const categorieService = {
  lister: () => api.get<Categorie[]>('/categories').then(r => r.data),
  creer:  (data: object) => api.post<Categorie>('/categories', data).then(r => r.data),
  modifier: (id: string, data: object) => api.put<Categorie>(`/categories/${id}`, data).then(r => r.data),
  supprimer: (id: string) => api.delete(`/categories/${id}`).then(r => r.data),
};

// ── Articles ──────────────────────────────────────────────
export const articleService = {
  lister: (params?: object) => api.get<Article[]>('/articles', { params }).then(r => r.data),
  getById: (id: string) => api.get<Article>(`/articles/${id}`).then(r => r.data),
  creer: (data: object) => api.post<Article>('/articles', data).then(r => r.data),
  modifier: (id: string, data: object) => api.put<Article>(`/articles/${id}`, data).then(r => r.data),
  toggleActif: (id: string) => api.patch(`/articles/${id}/actif`).then(r => r.data),
  supprimer: (id: string) => api.delete(`/articles/${id}`).then(r => r.data),
};

// ── Clients ───────────────────────────────────────────────
export const clientService = {
  lister: (params?: object) => api.get<Client[]>('/clients', { params }).then(r => r.data),
  getById: (id: string) => api.get<Client>(`/clients/${id}`).then(r => r.data),
  historique: (id: string) => api.get(`/clients/${id}/historique`).then(r => r.data),
  creer: (data: object) => api.post<Client>('/clients', data).then(r => r.data),
  modifier: (id: string, data: object) => api.put<Client>(`/clients/${id}`, data).then(r => r.data),
  definirPrixNegocie: (id: string, data: object) =>
    api.post(`/clients/${id}/prix-negocies`, data).then(r => r.data),
  supprimerPrixNegocie: (clientId: string, pnId: string) =>
    api.delete(`/clients/${clientId}/prix-negocies/${pnId}`).then(r => r.data),
};

// ── Stocks ────────────────────────────────────────────────
export const stockService = {
  entree: (data: object) => api.post('/stocks/entree', data).then(r => r.data),
  ajustement: (data: object) => api.post('/stocks/ajustement', data).then(r => r.data),
  historique: (articleId: string, params?: object) =>
    api.get<MouvementStock[]>(`/stocks/historique/${articleId}`, { params }).then(r => r.data),
  alertes: () => api.get<Alerte[]>('/stocks/alertes').then(r => r.data),
};

// ── Ventes ────────────────────────────────────────────────
export const venteService = {
  lister: (params?: object) => api.get<Vente[]>('/ventes', { params }).then(r => r.data),
  getById: (id: string) => api.get<Vente>(`/ventes/${id}`).then(r => r.data),
  creer: (data: object) => api.post<Vente>('/ventes', data).then(r => r.data),
  annuler: (id: string, motif: string) =>
    api.post(`/ventes/${id}/annuler`, { motif }).then(r => r.data),
};

// ── Devis ─────────────────────────────────────────────────
export const devisService = {
  lister: (params?: object) => api.get<Devis[]>('/devis', { params }).then(r => r.data),
  getById: (id: string) => api.get<Devis>(`/devis/${id}`).then(r => r.data),
  creer: (data: object) => api.post<Devis>('/devis', data).then(r => r.data),
  changerStatut: (id: string, statut: string) =>
    api.patch(`/devis/${id}/statut`, { statut }).then(r => r.data),
  convertir: (id: string, mode_paiement?: string) =>
    api.post(`/devis/${id}/convertir`, { mode_paiement }).then(r => r.data),
};

// ── Crédits ───────────────────────────────────────────────
export const creditService = {
  lister: (params?: object) => api.get<Credit[]>('/credits', { params }).then(r => r.data),
  getById: (id: string) => api.get<Credit>(`/credits/${id}`).then(r => r.data),
  echeances: () => api.get<Credit[]>('/credits/echeances').then(r => r.data),
  versement: (id: string, montant: number) =>
    api.post(`/credits/${id}/versement`, { montant }).then(r => r.data),
};

// ── Dashboard ─────────────────────────────────────────────
export const dashboardService = {
  get: (params?: object) => api.get<DashboardData>('/dashboard', { params }).then(r => r.data),
};

// ── Alertes ───────────────────────────────────────────────
export const alerteService = {
  lister: () => api.get<Alerte[]>('/alertes').then(r => r.data),
  marquerLue: (id: string) => api.patch(`/alertes/${id}/lue`).then(r => r.data),
  marquerToutesLues: () => api.patch('/alertes/toutes/lues').then(r => r.data),
};
