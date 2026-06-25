import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articleService, categorieService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { formatMontant } from '../../utils';
import type { Article } from '../../types';

export default function ArticlesPage() {
  const { isResponsable } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editArticle, setEditArticle] = useState<Article | null>(null);
  const [form, setForm] = useState({
    reference: '', nom: '', description: '', categorie_id: '',
    unite_mesure: 'unité', prix_vente_public: '', prix_achat: '', seuil_alerte: '0',
  });
  const [error, setError] = useState('');

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles', search, catFilter],
    queryFn: () => articleService.lister({ search: search || undefined, categorie_id: catFilter || undefined }),
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categorieService.lister });

  const createMut = useMutation({
    mutationFn: articleService.creer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['articles'] }); resetForm(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => articleService.modifier(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['articles'] }); resetForm(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });
  const toggleMut = useMutation({
    mutationFn: articleService.toggleActif,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['articles'] }),
  });

  const resetForm = () => {
    setShowForm(false); setEditArticle(null); setError('');
    setForm({ reference: '', nom: '', description: '', categorie_id: '',
      unite_mesure: 'unité', prix_vente_public: '', prix_achat: '', seuil_alerte: '0' });
  };

  const openEdit = (a: Article) => {
    setEditArticle(a);
    setForm({
      reference: a.reference, nom: a.nom, description: a.description || '',
      categorie_id: a.categorie_id, unite_mesure: a.unite_mesure,
      prix_vente_public: String(a.prix_vente_public),
      prix_achat: String(a.prix_achat ?? ''),
      seuil_alerte: String(a.seuil_alerte),
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const data = { ...form, prix_vente_public: parseFloat(form.prix_vente_public),
      prix_achat: parseFloat(form.prix_achat || '0'), seuil_alerte: parseFloat(form.seuil_alerte) };
    if (editArticle) updateMut.mutate({ id: editArticle.id, data });
    else createMut.mutate(data);
  };

  const unites = ['unité', 'mètre', 'kg', 'litre', 'sachet', 'rouleau', 'barre', 'paquet', 'boîte'];

  const stockClass = (a: Article) => {
    if (a.stock_actuel <= 0) return 'stock-rupture';
    if (a.stock_actuel <= a.seuil_alerte) return 'stock-bas';
    return 'stock-ok';
  };

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Articles</h2>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditArticle(null); }}>
          + Nouvel article
        </button>
      </div>

      {/* Filtres */}
      <div className="search-bar">
        <input className="search-input" placeholder="Rechercher un article..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-control" style={{ width: 'auto' }}
          value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {isLoading ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Réf.</th><th>Article</th><th>Catégorie</th><th>Unité</th>
                  <th>Prix vente</th>
                  {isResponsable && <th>Prix achat</th>}
                  {isResponsable && <th>Marge</th>}
                  <th>Stock</th><th>Seuil</th><th>Statut</th><th></th>
                </tr>
              </thead>
              <tbody>
                {articles?.map(a => (
                  <tr key={a.id} style={{ opacity: a.actif ? 1 : .5 }}>
                    <td className="text-sm text-muted">{a.reference}</td>
                    <td className="font-bold">{a.nom}</td>
                    <td>{a.categorie_nom}</td>
                    <td>{a.unite_mesure}</td>
                    <td>{formatMontant(a.prix_vente_public)}</td>
                    {isResponsable && <td>{a.prix_achat !== undefined ? formatMontant(a.prix_achat) : '—'}</td>}
                    {isResponsable && (
                      <td style={{ color: '#1B4332' }}>
                        {a.prix_achat !== undefined
                          ? formatMontant(a.prix_vente_public - a.prix_achat) : '—'}
                      </td>
                    )}
                    <td className={stockClass(a)}>{a.stock_actuel} {a.unite_mesure}</td>
                    <td className="text-muted">{a.seuil_alerte}</td>
                    <td>
                      <span className={`badge ${a.actif ? 'badge-green' : 'badge-gray'}`}>
                        {a.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>Modifier</button>
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => toggleMut.mutate(a.id)}>
                          {a.actif ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!articles?.length && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>
                    Aucun article trouvé
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editArticle ? 'Modifier article' : 'Nouvel article'}</span>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Référence *</label>
                    <input className="form-control" value={form.reference}
                      onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Catégorie *</label>
                    <select className="form-control" value={form.categorie_id}
                      onChange={e => setForm(f => ({ ...f, categorie_id: e.target.value }))} required>
                      <option value="">Sélectionner...</option>
                      {categories?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nom de l'article *</label>
                  <input className="form-control" value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Unité de mesure *</label>
                    <select className="form-control" value={form.unite_mesure}
                      onChange={e => setForm(f => ({ ...f, unite_mesure: e.target.value }))}>
                      {unites.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Seuil d'alerte</label>
                    <input type="number" min="0" className="form-control" value={form.seuil_alerte}
                      onChange={e => setForm(f => ({ ...f, seuil_alerte: e.target.value }))} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Prix de vente public (FCFA) *</label>
                    <input type="number" min="0" className="form-control" value={form.prix_vente_public}
                      onChange={e => setForm(f => ({ ...f, prix_vente_public: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prix d'achat (FCFA) *</label>
                    <input type="number" min="0" className="form-control" value={form.prix_achat}
                      onChange={e => setForm(f => ({ ...f, prix_achat: e.target.value }))}
                      required={!editArticle} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={2} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Annuler</button>
                <button type="submit" className="btn btn-primary"
                  disabled={createMut.isPending || updateMut.isPending}>
                  {createMut.isPending || updateMut.isPending ? <span className="spinner" /> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
