import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { venteService, articleService, clientService } from '../../services';
import { formatMontant } from '../../utils';
import type { Article, Client } from '../../types';

interface LigneForm {
  article: Article;
  quantite: number;
  prix_unitaire: number;
  prix_modifie: boolean;
  note_modification: string;
}

export default function NouvelleVentePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [client, setClient]           = useState<Client | null>(null);
  const [searchClient, setSearchClient] = useState('');
  const [showClients, setShowClients] = useState(false);
  const [searchArticle, setSearchArticle] = useState('');
  const [showArticles, setShowArticles] = useState(false);
  const [lignes, setLignes]           = useState<LigneForm[]>([]);
  const [modePaiement, setModePaiement] = useState<'ESPECES' | 'MOBILE_MONEY' | 'CREDIT' | 'MIXTE'>('ESPECES');
  const [montantEspeces, setMontantEspeces] = useState('');
  const [montantMobile, setMontantMobile]   = useState('');
  const [dateEcheance, setDateEcheance]     = useState('');
  const [error, setError]             = useState('');

  // Données
  const { data: clients } = useQuery({
    queryKey: ['clients', searchClient],
    queryFn: () => clientService.lister({ search: searchClient }),
    enabled: searchClient.length >= 2,
  });

  const { data: articles } = useQuery({
    queryKey: ['articles-search', searchArticle],
    queryFn: () => articleService.lister({ search: searchArticle, actif: 'true' }),
    enabled: searchArticle.length >= 2,
  });

  const venteMut = useMutation({
    mutationFn: venteService.creer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventes'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      qc.invalidateQueries({ queryKey: ['alertes'] });
      navigate('/ventes');
    },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur lors de la création'),
  });

  // Calculer le prix à appliquer selon le client
  const getPrixPourClient = useCallback((article: Article): number => {
    if (!client || client.type !== 'PROFESSIONNEL') return article.prix_vente_public;
    const pn = client.prix_negocies?.find(p => p.article_id === article.id);
    return pn ? pn.prix : article.prix_vente_public;
  }, [client]);

  const ajouterArticle = (article: Article) => {
    // Vérifier que l'article n'est pas déjà dans la liste
    if (lignes.find(l => l.article.id === article.id)) {
      setError(`"${article.nom}" est déjà dans la vente`);
      return;
    }
    if (article.stock_actuel <= 0) {
      setError(`"${article.nom}" est en rupture de stock`);
      return;
    }
    const prix = getPrixPourClient(article);
    setLignes(prev => [...prev, {
      article, quantite: 1, prix_unitaire: prix,
      prix_modifie: prix !== article.prix_vente_public, note_modification: '',
    }]);
    setSearchArticle('');
    setShowArticles(false);
    setError('');
  };

  const mettreAJourLigne = (index: number, champ: Partial<LigneForm>) => {
    setLignes(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const updated = { ...l, ...champ };
      if (champ.prix_unitaire !== undefined) {
        updated.prix_modifie = champ.prix_unitaire !== l.article.prix_vente_public;
      }
      return updated;
    }));
  };

  const supprimerLigne = (index: number) => {
    setLignes(prev => prev.filter((_, i) => i !== index));
  };

  const total = lignes.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0);

  const montantCredit = () => {
    if (modePaiement === 'ESPECES') return 0;
    if (modePaiement === 'MOBILE_MONEY') return 0;
    if (modePaiement === 'CREDIT') return total;
    // MIXTE
    return Math.max(0, total - (parseFloat(montantEspeces) || 0) - (parseFloat(montantMobile) || 0));
  };

  const validerVente = () => {
    setError('');
    if (!lignes.length) { setError('Ajoutez au moins un article'); return; }

    // Vérifications lignes
    for (const l of lignes) {
      if (l.quantite <= 0) { setError(`Quantité invalide pour "${l.article.nom}"`); return; }
      if (l.quantite > l.article.stock_actuel) {
        setError(`Stock insuffisant pour "${l.article.nom}" : ${l.article.stock_actuel} disponible`);
        return;
      }
      if (l.prix_modifie && !l.note_modification.trim()) {
        setError(`Note obligatoire pour le prix modifié de "${l.article.nom}"`);
        return;
      }
    }

    // Vérification crédit
    if ((modePaiement === 'CREDIT' || modePaiement === 'MIXTE') && montantCredit() > 0) {
      if (!client) { setError('Un client est requis pour une vente à crédit'); return; }
      if (!dateEcheance) { setError('Date d\'échéance requise pour le crédit'); return; }
    }

    const payload: any = {
      client_id: client?.id || null,
      lignes: lignes.map(l => ({
        article_id: l.article.id,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
        note_modification: l.note_modification || undefined,
      })),
      mode_paiement: modePaiement,
      montant_especes: parseFloat(montantEspeces) || 0,
      montant_mobile: parseFloat(montantMobile) || 0,
      montant_credit: montantCredit(),
    };

    if (dateEcheance) payload.date_echeance = dateEcheance;

    venteMut.mutate(payload);
  };

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Nouvelle vente</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/ventes')}>← Retour</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'flex-start' }}>

        {/* Colonne principale */}
        <div>
          {/* Sélection client */}
          <div className="card mb-4">
            <div className="card-title">Client</div>
            {client ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{client.nom}</div>
                  <div className="text-muted text-sm">
                    {client.type === 'PROFESSIONNEL' ? '🏢 Professionnel' : '👤 Particulier'}
                    {client.telephone && ` — ${client.telephone}`}
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setClient(null)}>
                  Changer
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  placeholder="Rechercher un client (nom, téléphone)... ou laisser vide pour vente anonyme"
                  value={searchClient}
                  onChange={e => { setSearchClient(e.target.value); setShowClients(true); }}
                  onFocus={() => setShowClients(true)}
                />
                {showClients && clients && clients.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: '#fff', border: '1px solid #E5E7EB',
                    borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.1)',
                    zIndex: 100, maxHeight: 220, overflowY: 'auto',
                  }}>
                    {clients.map(c => (
                      <div key={c.id}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}
                        onMouseDown={() => { setClient(c); setSearchClient(''); setShowClients(false); }}>
                        <div className="font-bold">{c.nom}</div>
                        <div className="text-muted text-sm">
                          {c.type === 'PROFESSIONNEL' ? 'Professionnel' : 'Particulier'}
                          {c.telephone && ` — ${c.telephone}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ajout articles */}
          <div className="card mb-4">
            <div className="card-title">Articles</div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                className="form-control"
                placeholder="Rechercher et ajouter un article..."
                value={searchArticle}
                onChange={e => { setSearchArticle(e.target.value); setShowArticles(true); }}
                onFocus={() => setShowArticles(true)}
              />
              {showArticles && articles && articles.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', border: '1px solid #E5E7EB',
                  borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.1)',
                  zIndex: 100, maxHeight: 260, overflowY: 'auto',
                }}>
                  {articles.filter(a => a.actif).map(a => {
                    const prixClient = getPrixPourClient(a);
                    const negocié = prixClient !== a.prix_vente_public;
                    return (
                      <div key={a.id}
                        style={{
                          padding: '10px 14px', cursor: a.stock_actuel <= 0 ? 'not-allowed' : 'pointer',
                          opacity: a.stock_actuel <= 0 ? 0.5 : 1,
                          borderBottom: '1px solid #F3F4F6',
                          background: a.stock_actuel <= 0 ? '#FFF5F5' : undefined,
                        }}
                        onMouseDown={() => { if (a.stock_actuel > 0) ajouterArticle(a); }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold">{a.nom}</span>
                            <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{a.reference}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="font-bold" style={{ color: negocié ? '#2563EB' : undefined }}>
                              {formatMontant(prixClient)}
                              {negocié && <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 10 }}>Négocié</span>}
                            </div>
                            <div className={`text-sm ${a.stock_actuel <= 0 ? 'stock-rupture' : a.stock_actuel <= a.seuil_alerte ? 'stock-bas' : 'stock-ok'}`}>
                              Stock : {a.stock_actuel} {a.unite_mesure}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lignes de vente */}
            {lignes.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Article</th><th>Stock dispo</th><th>Quantité</th>
                    <th>Prix unitaire</th><th>Sous-total</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr key={l.article.id}>
                      <td>
                        <div className="font-bold">{l.article.nom}</div>
                        <div className="text-muted text-sm">{l.article.unite_mesure}</div>
                      </td>
                      <td className={l.article.stock_actuel <= l.article.seuil_alerte ? 'stock-bas' : 'stock-ok'}>
                        {l.article.stock_actuel}
                      </td>
                      <td>
                        <input
                          type="number" min="0.01" max={l.article.stock_actuel} step="0.01"
                          className="form-control" style={{ width: 80 }}
                          value={l.quantite}
                          onChange={e => mettreAJourLigne(i, { quantite: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td>
                        <div>
                          <input
                            type="number" min="0" className="form-control" style={{ width: 110 }}
                            value={l.prix_unitaire}
                            onChange={e => mettreAJourLigne(i, { prix_unitaire: parseFloat(e.target.value) || 0 })}
                          />
                          {l.prix_modifie && (
                            <input
                              className="form-control" style={{ marginTop: 4, fontSize: 12 }}
                              placeholder="Note obligatoire *"
                              value={l.note_modification}
                              onChange={e => mettreAJourLigne(i, { note_modification: e.target.value })}
                            />
                          )}
                        </div>
                      </td>
                      <td className="font-bold">
                        {formatMontant(l.prix_unitaire * l.quantite)}
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => supprimerLigne(i)}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: '#6B7280', background: '#F9FAFB', borderRadius: 6 }}>
                Recherchez et ajoutez des articles ci-dessus
              </div>
            )}
          </div>
        </div>

        {/* Colonne récap + paiement */}
        <div>
          <div className="card mb-4">
            <div className="card-title">Récapitulatif</div>
            <div style={{ marginBottom: 16 }}>
              {lignes.map(l => (
                <div key={l.article.id} className="flex items-center justify-between"
                  style={{ padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <span className="text-sm">{l.article.nom} × {l.quantite}</span>
                  <span className="font-bold text-sm">{formatMontant(l.prix_unitaire * l.quantite)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between"
              style={{ paddingTop: 8, borderTop: '2px solid #E5E7EB' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>TOTAL</span>
              <span style={{ fontWeight: 700, fontSize: 20, color: '#1B4332' }}>{formatMontant(total)}</span>
            </div>
          </div>

          {/* Mode de paiement */}
          <div className="card mb-4">
            <div className="card-title">Mode de paiement</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {(['ESPECES', 'MOBILE_MONEY', 'CREDIT', 'MIXTE'] as const).map(m => (
                <button key={m}
                  className={`btn ${modePaiement === m ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'center', fontSize: 12 }}
                  onClick={() => setModePaiement(m)}>
                  {m === 'ESPECES' ? '💵 Espèces' : m === 'MOBILE_MONEY' ? '📱 Mobile Money' : m === 'CREDIT' ? '💳 Crédit' : '🔀 Mixte'}
                </button>
              ))}
            </div>

            {modePaiement === 'MIXTE' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Espèces (FCFA)</label>
                  <input type="number" min="0" className="form-control"
                    value={montantEspeces} onChange={e => setMontantEspeces(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Money (FCFA)</label>
                  <input type="number" min="0" className="form-control"
                    value={montantMobile} onChange={e => setMontantMobile(e.target.value)} />
                </div>
                <div style={{ padding: '8px 0', borderTop: '1px solid #E5E7EB' }}>
                  <span className="text-muted text-sm">Montant à crédit : </span>
                  <span className="font-bold" style={{ color: '#D97706' }}>{formatMontant(montantCredit())}</span>
                </div>
              </div>
            )}

            {(modePaiement === 'CREDIT' || (modePaiement === 'MIXTE' && montantCredit() > 0)) && (
              <div className="form-group">
                <label className="form-label">Date d'échéance *</label>
                <input type="date" className="form-control"
                  min={new Date().toISOString().split('T')[0]}
                  value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} />
                {!client && (
                  <div className="form-error">⚠️ Un client est requis pour une vente à crédit</div>
                )}
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}
            disabled={!lignes.length || venteMut.isPending}
            onClick={validerVente}>
            {venteMut.isPending ? <span className="spinner" /> : `✓ Valider la vente — ${formatMontant(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
