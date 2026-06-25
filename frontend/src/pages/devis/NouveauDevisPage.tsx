import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devisService, articleService, clientService } from '../../services';
import { formatMontant } from '../../utils';
import type { Article, Client } from '../../types';

interface LigneDevisForm {
  article: Article;
  quantite: number;
  prix_unitaire: number;
}

export default function NouveauDevisPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [client, setClient]             = useState<Client | null>(null);
  const [searchClient, setSearchClient] = useState('');
  const [showClients, setShowClients]   = useState(false);
  const [searchArticle, setSearchArticle] = useState('');
  const [showArticles, setShowArticles] = useState(false);
  const [lignes, setLignes]             = useState<LigneDevisForm[]>([]);
  const [dateValidite, setDateValidite] = useState('');
  const [note, setNote]                 = useState('');
  const [stockReserve, setStockReserve] = useState(false);
  const [error, setError]               = useState('');

  const { data: clients } = useQuery({
    queryKey: ['clients-search', searchClient],
    queryFn: () => clientService.lister({ search: searchClient }),
    enabled: searchClient.length >= 2,
  });

  const { data: articles } = useQuery({
    queryKey: ['articles-devis', searchArticle],
    queryFn: () => articleService.lister({ search: searchArticle, actif: 'true' }),
    enabled: searchArticle.length >= 2,
  });

  const devisMut = useMutation({
    mutationFn: devisService.creer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['devis'] }); navigate('/devis'); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const getPrixClient = useCallback((article: Article) => {
    if (!client) return article.prix_vente_public;
    const pn = client.prix_negocies?.find(p => p.article_id === article.id);
    return pn ? pn.prix : article.prix_vente_public;
  }, [client]);

  const ajouterArticle = (article: Article) => {
    if (lignes.find(l => l.article.id === article.id)) return;
    setLignes(prev => [...prev, { article, quantite: 1, prix_unitaire: getPrixClient(article) }]);
    setSearchArticle(''); setShowArticles(false);
  };

  const total = lignes.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0);

  const valider = () => {
    setError('');
    if (!client) { setError('Client requis pour un devis'); return; }
    if (!lignes.length) { setError('Ajoutez au moins un article'); return; }
    if (!dateValidite) { setError('Date de validité requise'); return; }

    devisMut.mutate({
      client_id: client.id,
      lignes: lignes.map(l => ({ article_id: l.article.id, quantite: l.quantite, prix_unitaire: l.prix_unitaire })),
      date_validite: dateValidite,
      note: note || undefined,
      stock_reserve: stockReserve,
    });
  };

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Nouveau devis</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/devis')}>← Retour</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'flex-start' }}>
        <div>
          {/* Client */}
          <div className="card mb-4">
            <div className="card-title">Client *</div>
            {client ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{client.nom}</div>
                  <div className="text-muted text-sm">{client.type === 'PROFESSIONNEL' ? 'Professionnel' : 'Particulier'}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setClient(null)}>Changer</button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input className="form-control" placeholder="Rechercher un client..."
                  value={searchClient}
                  onChange={e => { setSearchClient(e.target.value); setShowClients(true); }}
                  onFocus={() => setShowClients(true)} />
                {showClients && clients?.length ? (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0,
                    background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6,
                    boxShadow: '0 4px 12px rgba(0,0,0,.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                    {clients.map(c => (
                      <div key={c.id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}
                        onMouseDown={() => { setClient(c); setSearchClient(''); setShowClients(false); }}>
                        <div className="font-bold">{c.nom}</div>
                        <div className="text-muted text-sm">{c.type === 'PROFESSIONNEL' ? 'Pro' : 'Particulier'}{c.telephone && ` — ${c.telephone}`}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Articles */}
          <div className="card mb-4">
            <div className="card-title">Articles</div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input className="form-control" placeholder="Rechercher et ajouter un article..."
                value={searchArticle}
                onChange={e => { setSearchArticle(e.target.value); setShowArticles(true); }}
                onFocus={() => setShowArticles(true)} />
              {showArticles && articles?.length ? (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6,
                  boxShadow: '0 4px 12px rgba(0,0,0,.1)', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
                  {articles.filter(a => a.actif).map(a => (
                    <div key={a.id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}
                      onMouseDown={() => ajouterArticle(a)}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{a.nom}</span>
                        <span>{formatMontant(getPrixClient(a))}</span>
                      </div>
                      <div className="text-muted text-sm">Stock : {a.stock_actuel} {a.unite_mesure}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {lignes.length > 0 ? (
              <table>
                <thead><tr><th>Article</th><th>Quantité</th><th>Prix unit.</th><th>Sous-total</th><th></th></tr></thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr key={l.article.id}>
                      <td>{l.article.nom}<br/><span className="text-muted text-sm">{l.article.unite_mesure}</span></td>
                      <td><input type="number" min="0.01" step="0.01" className="form-control" style={{ width: 80 }}
                        value={l.quantite} onChange={e => setLignes(prev => prev.map((x, j) => j === i ? { ...x, quantite: parseFloat(e.target.value) || 0 } : x))} /></td>
                      <td><input type="number" min="0" className="form-control" style={{ width: 110 }}
                        value={l.prix_unitaire} onChange={e => setLignes(prev => prev.map((x, j) => j === i ? { ...x, prix_unitaire: parseFloat(e.target.value) || 0 } : x))} /></td>
                      <td className="font-bold">{formatMontant(l.prix_unitaire * l.quantite)}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => setLignes(p => p.filter((_, j) => j !== i))}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: '#6B7280', background: '#F9FAFB', borderRadius: 6 }}>
                Recherchez et ajoutez des articles
              </div>
            )}
          </div>

          {/* Note */}
          <div className="card">
            <div className="form-group">
              <label className="form-label">Note (optionnelle)</label>
              <textarea className="form-control" rows={2} value={note}
                onChange={e => setNote(e.target.value)} placeholder="Conditions particulières, remarques..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="reserve" checked={stockReserve}
                onChange={e => setStockReserve(e.target.checked)} />
              <label htmlFor="reserve" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                Réserver le stock pour ce devis
              </label>
            </div>
          </div>
        </div>

        {/* Résumé */}
        <div>
          <div className="card mb-4">
            <div className="card-title">Récapitulatif</div>
            {lignes.map(l => (
              <div key={l.article.id} className="flex items-center justify-between"
                style={{ padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span className="text-sm">{l.article.nom} × {l.quantite}</span>
                <span className="font-bold text-sm">{formatMontant(l.prix_unitaire * l.quantite)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between" style={{ paddingTop: 8, borderTop: '2px solid #E5E7EB', marginTop: 4 }}>
              <span style={{ fontWeight: 700 }}>TOTAL</span>
              <span style={{ fontWeight: 700, fontSize: 20, color: '#1B4332' }}>{formatMontant(total)}</span>
            </div>
          </div>

          <div className="card mb-4">
            <div className="form-group">
              <label className="form-label">Date de validité *</label>
              <input type="date" className="form-control"
                min={new Date().toISOString().split('T')[0]}
                value={dateValidite} onChange={e => setDateValidite(e.target.value)} />
            </div>
          </div>

          <button className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}
            disabled={!lignes.length || !client || !dateValidite || devisMut.isPending}
            onClick={valider}>
            {devisMut.isPending ? <span className="spinner" /> : `✓ Créer le devis — ${formatMontant(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
