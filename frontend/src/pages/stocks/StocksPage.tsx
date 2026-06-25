import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockService, articleService } from '../../services';
import { formatMontant, formatDateHeure } from '../../utils';
import type { Article } from '../../types';

export default function StocksPage() {
  const qc = useQueryClient();
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [mode, setMode] = useState<'entree' | 'ajustement' | null>(null);
  const [form, setForm] = useState({ quantite: '', prix_achat: '', motif: '', nouvelle_quantite: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles', search],
    queryFn: () => articleService.lister({ search: search || undefined }),
  });

  const { data: historique } = useQuery({
    queryKey: ['historique', selectedArticle?.id],
    queryFn: () => stockService.historique(selectedArticle!.id),
    enabled: !!selectedArticle,
  });

  const entreeMut = useMutation({
    mutationFn: stockService.entree,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['articles'] }); qc.invalidateQueries({ queryKey: ['historique'] }); resetForm(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });
  const ajustMut = useMutation({
    mutationFn: stockService.ajustement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['articles'] }); qc.invalidateQueries({ queryKey: ['historique'] }); resetForm(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const resetForm = () => { setMode(null); setError(''); setForm({ quantite: '', prix_achat: '', motif: '', nouvelle_quantite: '' }); };

  const handleEntree = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    entreeMut.mutate({ article_id: selectedArticle!.id, quantite: parseFloat(form.quantite), prix_achat: parseFloat(form.prix_achat) || undefined });
  };

  const handleAjustement = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    ajustMut.mutate({ article_id: selectedArticle!.id, nouvelle_quantite: parseFloat(form.nouvelle_quantite), motif: form.motif });
  };

  const stockClass = (a: Article) => {
    if (a.stock_actuel <= 0) return 'stock-rupture';
    if (a.stock_actuel <= a.seuil_alerte) return 'stock-bas';
    return 'stock-ok';
  };

  return (
    <div className="page">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Gestion des stocks</h2>

      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        {/* Liste articles */}
        <div>
          <div className="search-bar">
            <input className="search-input" placeholder="Rechercher un article..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              {isLoading ? <div className="loading-center"><span className="spinner" /></div> : (
                <table>
                  <thead><tr><th>Article</th><th>Stock</th><th></th></tr></thead>
                  <tbody>
                    {articles?.filter(a => a.actif).map(a => (
                      <tr key={a.id} style={{ cursor: 'pointer', background: selectedArticle?.id === a.id ? 'var(--vert-pale)' : undefined }}
                        onClick={() => setSelectedArticle(a)}>
                        <td>
                          <div className="font-bold">{a.nom}</div>
                          <div className="text-muted text-sm">{a.reference} — {a.categorie_nom}</div>
                        </td>
                        <td className={stockClass(a)}>{a.stock_actuel} {a.unite_mesure}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-primary btn-sm"
                              onClick={ev => { ev.stopPropagation(); setSelectedArticle(a); setMode('entree'); }}>
                              + Entrée
                            </button>
                            <button className="btn btn-secondary btn-sm"
                              onClick={ev => { ev.stopPropagation(); setSelectedArticle(a); setMode('ajustement'); }}>
                              Ajuster
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Détail article sélectionné */}
        <div>
          {selectedArticle && (
            <>
              <div className="card mb-4">
                <div className="card-title">{selectedArticle.nom}</div>
                <div className="grid-2">
                  <div><span className="text-muted text-sm">Stock actuel</span>
                    <div className={`font-bold ${stockClass(selectedArticle)}`} style={{ fontSize: 22 }}>
                      {selectedArticle.stock_actuel} {selectedArticle.unite_mesure}
                    </div>
                  </div>
                  <div><span className="text-muted text-sm">Seuil d'alerte</span>
                    <div style={{ fontSize: 18 }}>{selectedArticle.seuil_alerte} {selectedArticle.unite_mesure}</div>
                  </div>
                </div>

                {mode === 'entree' && (
                  <form onSubmit={handleEntree} style={{ marginTop: 16 }}>
                    {error && <div className="alert alert-error">{error}</div>}
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Quantité reçue *</label>
                        <input type="number" min="0.01" step="0.01" className="form-control"
                          value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Prix d'achat unitaire (FCFA)</label>
                        <input type="number" min="0" className="form-control"
                          value={form.prix_achat} onChange={e => setForm(f => ({ ...f, prix_achat: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn btn-primary" disabled={entreeMut.isPending}>
                        {entreeMut.isPending ? <span className="spinner" /> : 'Enregistrer l\'entrée'}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={resetForm}>Annuler</button>
                    </div>
                  </form>
                )}

                {mode === 'ajustement' && (
                  <form onSubmit={handleAjustement} style={{ marginTop: 16 }}>
                    {error && <div className="alert alert-error">{error}</div>}
                    <div className="form-group">
                      <label className="form-label">Nouvelle quantité *</label>
                      <input type="number" min="0" step="0.01" className="form-control"
                        value={form.nouvelle_quantite} onChange={e => setForm(f => ({ ...f, nouvelle_quantite: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Motif de l'ajustement *</label>
                      <input className="form-control" placeholder="Ex: Casse, perte, inventaire..."
                        value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} required />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn btn-primary" disabled={ajustMut.isPending}>
                        {ajustMut.isPending ? <span className="spinner" /> : 'Confirmer l\'ajustement'}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={resetForm}>Annuler</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Historique */}
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid #E5E7EB' }}>
                  Historique des mouvements
                </div>
                <div className="table-wrapper" style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Qté</th><th>Avant</th><th>Après</th><th>Gestionnaire</th></tr></thead>
                    <tbody>
                      {historique?.map(m => (
                        <tr key={m.id}>
                          <td className="text-sm">{formatDateHeure(m.created_at)}</td>
                          <td><span className={`badge ${m.type === 'ENTREE' ? 'badge-green' : m.type === 'SORTIE' ? 'badge-red' : 'badge-orange'}`}>
                            {m.type}</span></td>
                          <td className={m.quantite > 0 ? 'stock-ok' : 'stock-bas'}>
                            {m.quantite > 0 ? '+' : ''}{m.quantite}
                          </td>
                          <td>{m.stock_avant}</td>
                          <td className="font-bold">{m.stock_apres}</td>
                          <td className="text-sm">{m.gestionnaire_prenom} {m.gestionnaire_nom}</td>
                        </tr>
                      ))}
                      {!historique?.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#6B7280' }}>Aucun mouvement</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          {!selectedArticle && (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: '#6B7280' }}>
              Sélectionnez un article pour voir les détails et gérer le stock
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
