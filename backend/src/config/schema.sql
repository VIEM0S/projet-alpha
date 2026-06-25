-- ============================================================
-- PROJET ALPHA — MODULE 2 QUINCAILLERIE
-- Schéma PostgreSQL complet — Version 1.0
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. UTILISATEURS
-- ============================================================
CREATE TABLE utilisateurs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  login         VARCHAR(50)  NOT NULL UNIQUE,
  mot_de_passe  VARCHAR(255) NOT NULL,           -- bcrypt hash
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('RESPONSABLE', 'GESTIONNAIRE')),
  actif         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. CATEGORIES D'ARTICLES
-- ============================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. ARTICLES
-- ============================================================
CREATE TABLE articles (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference         VARCHAR(50)     NOT NULL UNIQUE,
  nom               VARCHAR(200)    NOT NULL,
  description       TEXT,
  categorie_id      UUID            NOT NULL REFERENCES categories(id),
  unite_mesure      VARCHAR(30)     NOT NULL,  -- unité, mètre, kg, litre, sachet, rouleau, barre
  prix_vente_public NUMERIC(12, 2)  NOT NULL CHECK (prix_vente_public >= 0),
  prix_achat        NUMERIC(12, 2)  NOT NULL CHECK (prix_achat >= 0),  -- visible responsable uniquement
  stock_actuel      NUMERIC(12, 2)  NOT NULL DEFAULT 0,
  seuil_alerte      NUMERIC(12, 2)  NOT NULL DEFAULT 0,
  actif             BOOLEAN         NOT NULL DEFAULT TRUE,
  created_by        UUID            NOT NULL REFERENCES utilisateurs(id),
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. FOURNISSEURS (structure prévue — phase 2)
-- ============================================================
CREATE TABLE fournisseurs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         VARCHAR(200) NOT NULL,
  telephone   VARCHAR(30),
  email       VARCHAR(150),
  adresse     TEXT,
  specialite  TEXT,
  actif       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. CLIENTS
-- ============================================================
CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         VARCHAR(200) NOT NULL,
  telephone   VARCHAR(30),
  adresse     TEXT,
  type        VARCHAR(20)  NOT NULL CHECK (type IN ('PARTICULIER', 'PROFESSIONNEL')),
  actif       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by  UUID         NOT NULL REFERENCES utilisateurs(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. PRIX NÉGOCIÉS (clients professionnels)
-- ============================================================
CREATE TABLE prix_negocies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID           NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  article_id   UUID           REFERENCES articles(id) ON DELETE CASCADE,
  categorie_id UUID           REFERENCES categories(id) ON DELETE CASCADE,
  prix         NUMERIC(12, 2) NOT NULL CHECK (prix >= 0),
  created_by   UUID           NOT NULL REFERENCES utilisateurs(id),
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  -- Un prix négocié est soit sur un article, soit sur une catégorie
  CONSTRAINT chk_article_ou_categorie CHECK (
    (article_id IS NOT NULL AND categorie_id IS NULL) OR
    (article_id IS NULL AND categorie_id IS NOT NULL)
  )
);

-- ============================================================
-- 7. MOUVEMENTS DE STOCK
-- ============================================================
CREATE TABLE mouvements_stock (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id      UUID           NOT NULL REFERENCES articles(id),
  type            VARCHAR(20)    NOT NULL CHECK (type IN ('ENTREE', 'SORTIE', 'AJUSTEMENT')),
  quantite        NUMERIC(12, 2) NOT NULL,      -- positif = entrée/ajustement positif, négatif = sortie/ajustement négatif
  stock_avant     NUMERIC(12, 2) NOT NULL,
  stock_apres     NUMERIC(12, 2) NOT NULL,
  prix_achat      NUMERIC(12, 2),               -- renseigné pour les entrées
  fournisseur_id  UUID           REFERENCES fournisseurs(id),
  motif           TEXT,                          -- obligatoire pour AJUSTEMENT
  reference_doc   UUID,                          -- lien vers vente ou devis si SORTIE
  gestionnaire_id UUID           NOT NULL REFERENCES utilisateurs(id),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. VENTES
-- ============================================================
CREATE TABLE ventes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID           REFERENCES clients(id),   -- NULL si vente anonyme
  total           NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  mode_paiement   VARCHAR(20)    NOT NULL CHECK (mode_paiement IN ('ESPECES', 'MOBILE_MONEY', 'CREDIT', 'MIXTE')),
  montant_especes NUMERIC(12, 2) DEFAULT 0,
  montant_mobile  NUMERIC(12, 2) DEFAULT 0,
  montant_credit  NUMERIC(12, 2) DEFAULT 0,
  statut          VARCHAR(20)    NOT NULL DEFAULT 'CONFIRMEE' CHECK (statut IN ('CONFIRMEE', 'ANNULEE')),
  motif_annulation TEXT,
  annulee_par     UUID           REFERENCES utilisateurs(id),
  annulee_at      TIMESTAMPTZ,
  gestionnaire_id UUID           NOT NULL REFERENCES utilisateurs(id),
  devis_id        UUID,                          -- lien si vente issue d'un devis
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. LIGNES DE VENTE
-- ============================================================
CREATE TABLE lignes_vente (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vente_id        UUID           NOT NULL REFERENCES ventes(id) ON DELETE CASCADE,
  article_id      UUID           NOT NULL REFERENCES articles(id),
  quantite        NUMERIC(12, 2) NOT NULL CHECK (quantite > 0),
  prix_unitaire   NUMERIC(12, 2) NOT NULL CHECK (prix_unitaire >= 0),
  prix_modifie    BOOLEAN        NOT NULL DEFAULT FALSE,
  note_modification TEXT,                        -- obligatoire si prix_modifie = TRUE
  sous_total      NUMERIC(12, 2) NOT NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. DEVIS
-- ============================================================
CREATE TABLE devis (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID           NOT NULL REFERENCES clients(id),
  statut          VARCHAR(20)    NOT NULL DEFAULT 'EN_ATTENTE'
                  CHECK (statut IN ('EN_ATTENTE', 'ACCEPTE', 'CONVERTI', 'REFUSE', 'EXPIRE')),
  date_validite   DATE           NOT NULL,
  total           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock_reserve   BOOLEAN        NOT NULL DEFAULT FALSE,
  note            TEXT,
  vente_id        UUID           REFERENCES ventes(id),    -- renseigné après conversion
  gestionnaire_id UUID           NOT NULL REFERENCES utilisateurs(id),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. LIGNES DE DEVIS
-- ============================================================
CREATE TABLE lignes_devis (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  devis_id      UUID           NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  article_id    UUID           NOT NULL REFERENCES articles(id),
  quantite      NUMERIC(12, 2) NOT NULL CHECK (quantite > 0),
  prix_unitaire NUMERIC(12, 2) NOT NULL CHECK (prix_unitaire >= 0),
  sous_total    NUMERIC(12, 2) NOT NULL,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. CRÉDITS
-- ============================================================
CREATE TABLE credits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vente_id        UUID           NOT NULL REFERENCES ventes(id),
  client_id       UUID           NOT NULL REFERENCES clients(id),
  montant_total   NUMERIC(12, 2) NOT NULL CHECK (montant_total > 0),
  acompte         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  solde           NUMERIC(12, 2) NOT NULL,
  date_echeance   DATE           NOT NULL,
  statut          VARCHAR(20)    NOT NULL DEFAULT 'EN_COURS'
                  CHECK (statut IN ('EN_COURS', 'SOLDE', 'EN_RETARD')),
  gestionnaire_id UUID           NOT NULL REFERENCES utilisateurs(id),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 13. VERSEMENTS (remboursements partiels des crédits)
-- ============================================================
CREATE TABLE versements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_id       UUID           NOT NULL REFERENCES credits(id),
  montant         NUMERIC(12, 2) NOT NULL CHECK (montant > 0),
  solde_avant     NUMERIC(12, 2) NOT NULL,
  solde_apres     NUMERIC(12, 2) NOT NULL,
  gestionnaire_id UUID           NOT NULL REFERENCES utilisateurs(id),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 14. ALERTES
-- ============================================================
CREATE TABLE alertes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        VARCHAR(30) NOT NULL CHECK (type IN ('STOCK_BAS', 'RUPTURE', 'RAPPEL_CREDIT')),
  article_id  UUID        REFERENCES articles(id),
  credit_id   UUID        REFERENCES credits(id),
  message     TEXT        NOT NULL,
  lue         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 15. JOURNAL D'AUDIT
-- ============================================================
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utilisateur_id  UUID        NOT NULL REFERENCES utilisateurs(id),
  action          VARCHAR(100) NOT NULL,   -- ex: VENTE_CREEE, STOCK_AJUSTE, CLIENT_MODIFIE
  table_cible     VARCHAR(50),
  enregistrement_id UUID,
  details         JSONB,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEX POUR LES PERFORMANCES
-- ============================================================
CREATE INDEX idx_articles_categorie    ON articles(categorie_id);
CREATE INDEX idx_articles_reference    ON articles(reference);
CREATE INDEX idx_articles_nom          ON articles USING gin(to_tsvector('french', nom));
CREATE INDEX idx_mouvements_article    ON mouvements_stock(article_id);
CREATE INDEX idx_mouvements_date       ON mouvements_stock(created_at);
CREATE INDEX idx_ventes_client         ON ventes(client_id);
CREATE INDEX idx_ventes_date           ON ventes(created_at);
CREATE INDEX idx_ventes_gestionnaire   ON ventes(gestionnaire_id);
CREATE INDEX idx_lignes_vente_vente    ON lignes_vente(vente_id);
CREATE INDEX idx_lignes_vente_article  ON lignes_vente(article_id);
CREATE INDEX idx_devis_client          ON devis(client_id);
CREATE INDEX idx_devis_statut          ON devis(statut);
CREATE INDEX idx_devis_validite        ON devis(date_validite);
CREATE INDEX idx_credits_client        ON credits(client_id);
CREATE INDEX idx_credits_echeance      ON credits(date_echeance);
CREATE INDEX idx_credits_statut        ON credits(statut);
CREATE INDEX idx_clients_nom           ON clients USING gin(to_tsvector('french', nom));
CREATE INDEX idx_alertes_lue           ON alertes(lue);
CREATE INDEX idx_prix_negocies_client  ON prix_negocies(client_id);
CREATE INDEX idx_audit_utilisateur     ON audit_log(utilisateur_id);
CREATE INDEX idx_audit_date            ON audit_log(created_at);

-- ============================================================
-- TRIGGERS — updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_utilisateurs_updated_at   BEFORE UPDATE ON utilisateurs   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_articles_updated_at       BEFORE UPDATE ON articles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated_at        BEFORE UPDATE ON clients        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fournisseurs_updated_at   BEFORE UPDATE ON fournisseurs   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_devis_updated_at          BEFORE UPDATE ON devis          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_credits_updated_at        BEFORE UPDATE ON credits        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_prix_negocies_updated_at  BEFORE UPDATE ON prix_negocies  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER — alerte automatique si stock <= seuil après mouvement
-- ============================================================
CREATE OR REPLACE FUNCTION check_stock_alerte()
RETURNS TRIGGER AS $$
DECLARE
  v_article RECORD;
BEGIN
  SELECT id, nom, stock_actuel, seuil_alerte INTO v_article
  FROM articles WHERE id = NEW.article_id;

  -- Supprimer les anciennes alertes non lues pour cet article
  DELETE FROM alertes WHERE article_id = NEW.article_id AND lue = FALSE;

  IF v_article.stock_actuel = 0 THEN
    INSERT INTO alertes (type, article_id, message)
    VALUES ('RUPTURE', v_article.id, 'RUPTURE DE STOCK : ' || v_article.nom);
  ELSIF v_article.stock_actuel <= v_article.seuil_alerte THEN
    INSERT INTO alertes (type, article_id, message)
    VALUES ('STOCK_BAS', v_article.id, 'Stock bas : ' || v_article.nom || ' (' || v_article.stock_actuel || ' restant)');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_stock_alerte
AFTER INSERT ON mouvements_stock
FOR EACH ROW EXECUTE FUNCTION check_stock_alerte();

-- ============================================================
-- DONNÉES INITIALES — Catégories par défaut
-- ============================================================
INSERT INTO categories (nom, description) VALUES
  ('Visserie & Boulonnerie', 'Vis, boulons, écrous, rondelles'),
  ('Outillage', 'Outils manuels et électriques'),
  ('Peinture & Revêtements', 'Peintures, vernis, enduits'),
  ('Plomberie', 'Tuyaux, raccords, robinetterie'),
  ('Électricité', 'Câbles, prises, interrupteurs, disjoncteurs'),
  ('Matériaux de construction', 'Ciment, sable, gravier, briques'),
  ('Menuiserie', 'Bois, panneaux, charnières, serrures'),
  ('Quincaillerie générale', 'Articles divers non classés ailleurs');
