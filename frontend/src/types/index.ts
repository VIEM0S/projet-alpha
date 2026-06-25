// ============================================================
// PROJET ALPHA — Types TypeScript
// ============================================================

export type Role = 'RESPONSABLE' | 'GESTIONNAIRE';
export type TypeClient = 'PARTICULIER' | 'PROFESSIONNEL';
export type ModePayment = 'ESPECES' | 'MOBILE_MONEY' | 'CREDIT' | 'MIXTE';
export type StatutVente = 'CONFIRMEE' | 'ANNULEE';
export type StatutDevis = 'EN_ATTENTE' | 'ACCEPTE' | 'CONVERTI' | 'REFUSE' | 'EXPIRE';
export type StatutCredit = 'EN_COURS' | 'SOLDE' | 'EN_RETARD';
export type TypeMouvement = 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';
export type TypeAlerte = 'STOCK_BAS' | 'RUPTURE' | 'RAPPEL_CREDIT';

// ── Utilisateur ───────────────────────────────────────────
export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  login: string;
  role: Role;
  actif: boolean;
  created_at: string;
}

// ── Catégorie ─────────────────────────────────────────────
export interface Categorie {
  id: string;
  nom: string;
  description?: string;
  nb_articles?: number;
  created_at: string;
}

// ── Article ───────────────────────────────────────────────
export interface Article {
  id: string;
  reference: string;
  nom: string;
  description?: string;
  categorie_id: string;
  categorie_nom: string;
  unite_mesure: string;
  prix_vente_public: number;
  prix_achat?: number;           // visible responsable uniquement
  stock_actuel: number;
  seuil_alerte: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

// ── Client ────────────────────────────────────────────────
export interface Client {
  id: string;
  nom: string;
  telephone?: string;
  adresse?: string;
  type: TypeClient;
  actif: boolean;
  solde_credit?: number;
  prix_negocies?: PrixNegocie[];
  created_at: string;
  updated_at: string;
}

export interface PrixNegocie {
  id: string;
  client_id: string;
  article_id?: string;
  categorie_id?: string;
  article_nom?: string;
  categorie_nom?: string;
  prix: number;
  created_at: string;
}

// ── Mouvement de stock ────────────────────────────────────
export interface MouvementStock {
  id: string;
  article_id: string;
  type: TypeMouvement;
  quantite: number;
  stock_avant: number;
  stock_apres: number;
  prix_achat?: number;
  fournisseur_id?: string;
  fournisseur_nom?: string;
  motif?: string;
  gestionnaire_id: string;
  gestionnaire_nom: string;
  gestionnaire_prenom: string;
  created_at: string;
}

// ── Ligne de vente ────────────────────────────────────────
export interface LigneVente {
  id: string;
  vente_id: string;
  article_id: string;
  article_nom: string;
  unite_mesure: string;
  reference: string;
  quantite: number;
  prix_unitaire: number;
  prix_modifie: boolean;
  note_modification?: string;
  sous_total: number;
}

// ── Vente ─────────────────────────────────────────────────
export interface Vente {
  id: string;
  client_id?: string;
  client_nom?: string;
  total: number;
  mode_paiement: ModePayment;
  montant_especes: number;
  montant_mobile: number;
  montant_credit: number;
  statut: StatutVente;
  motif_annulation?: string;
  gestionnaire_id: string;
  gestionnaire_nom: string;
  gestionnaire_prenom: string;
  devis_id?: string;
  lignes?: LigneVente[];
  nb_articles?: number;
  created_at: string;
}

// ── Ligne de devis ────────────────────────────────────────
export interface LigneDevis {
  id: string;
  devis_id: string;
  article_id: string;
  article_nom: string;
  unite_mesure: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
}

// ── Devis ─────────────────────────────────────────────────
export interface Devis {
  id: string;
  client_id: string;
  client_nom: string;
  statut: StatutDevis;
  date_validite: string;
  total: number;
  stock_reserve: boolean;
  note?: string;
  vente_id?: string;
  gestionnaire_id: string;
  gestionnaire_nom: string;
  lignes?: LigneDevis[];
  created_at: string;
  updated_at: string;
}

// ── Versement ─────────────────────────────────────────────
export interface Versement {
  id: string;
  credit_id: string;
  montant: number;
  solde_avant: number;
  solde_apres: number;
  gestionnaire_id: string;
  gestionnaire_nom: string;
  created_at: string;
}

// ── Crédit ────────────────────────────────────────────────
export interface Credit {
  id: string;
  vente_id: string;
  client_id: string;
  client_nom: string;
  client_telephone?: string;
  montant_total: number;
  acompte: number;
  solde: number;
  date_echeance: string;
  statut: StatutCredit;
  gestionnaire_id: string;
  versements?: Versement[];
  created_at: string;
  updated_at: string;
}

// ── Alerte ────────────────────────────────────────────────
export interface Alerte {
  id: string;
  type: TypeAlerte;
  article_id?: string;
  article_nom?: string;
  stock_actuel?: number;
  unite_mesure?: string;
  credit_id?: string;
  message: string;
  lue: boolean;
  created_at: string;
}

// ── Dashboard ─────────────────────────────────────────────
export interface DashboardData {
  periode: { debut: string; fin: string };
  ca: {
    total: number;
    nb_ventes: number;
    jour: number;
    mois: number;
  };
  marge: {
    totale: number;
    par_categorie: { categorie: string; ca: number; marge: number }[];
  };
  stock: {
    valeur_totale: number;
    alertes: Alerte[];
  };
  credits_en_cours: Credit[];
  top_articles: {
    id: string;
    nom: string;
    unite_mesure: string;
    qte_vendue: number;
    ca: number;
    marge: number;
  }[];
  gestionnaires: {
    id: string;
    nom: string;
    prenom: string;
    nb_ventes: number;
    total_ventes: number;
  }[];
}

// ── Auth ──────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  nom: string;
  prenom: string;
  login: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
