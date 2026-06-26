import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService, categorieService, articleService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/shared/Toast';
import { formatMontant, formatDate, statutVenteCouleur, statutCreditCouleur } from '../../utils';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isResponsable } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [onglet, setOnglet] = useState<'ventes' | 'credits' | 'devis' | 'prix'>('ventes');
  const [showPrixForm, setShowPrixForm] = useState(false);
  const [prixForm, setPrixForm] = useState({ article_id: '', categorie_id: '', prix: '' });

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getById(id!),
  });

  const { data: historique } = useQuery({
    queryKey: ['client-historique', id],
    queryFn: () => clientService.historique(id!),
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categorieService.lister });
  const { data: articles }   = useQuery({ queryKey: ['articles'],   queryFn: () => articleService.lister() });

  const prixMut = useMutation({
    mutationFn: (data: object) => clientService.definirPrixNegocie(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] });
      setShowPrixForm(false);
      setPrixForm({ article_id: '', categorie_id: '', prix: '' });
      toast.success('Prix négocié enregistré');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const supprimerPrixMut = useMutation({
    mutationFn: (pnId: string) => clientService.supprimerPrixNegocie(id!, pnId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] });
      toast.success('Prix négocié supprimé');
    },
  });

  if (isLoading) return <div className="loading-center"><span className="spinner" /></div>;
  if (!client)  return <div className="page"><div className="alert alert-error">Client introuvable</div></div>;

  const onglets = [
    { key: 'ventes',  label: `Ventes (${historique?.ventes?.length ?? 0})` },
    { key: 'credits', label: `Crédits (${historique?.credits?.length ?? 0})` },
    { key: 'devis',   label: `Devis (${historique?.devis?.length ?? 0})` },
    ...(isResponsable && client.type === 'PROFESSIONNEL'
      ? [{ key: 'prix', label: `Prix négociés (${client.prix_negocies?.length ?? 0})` }]
      : []),
  ];

  return (
    <div className="page">
      <div className="flex items-center gap-3 mb-6">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/clients')}>← Retour</button>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{client.nom}</h2>
        <span className={`badge ${client.type === 'PROFESSIONNEL' ? 'badge-blue' : 'badge-gray'}`}>
          {client.type === 'PROFESSIONNEL' ? 'Professionnel' : 'Particulier'}
        </span>
      </div>

      {/* Infos client */}
      <div className="card mb-4">
        <div className="grid-3">
          <div><div className="text-muted text-sm">Téléphone</div>
            <div className="font-bold">{client.telephone || '—'}</div></div>
          <div><div className="text-muted text-sm">Adresse</div>
            <div>{client.adresse || '—'}</div></div>
          <div><div className="text-muted text-sm">Solde crédit en cours</div>
            <div className="font-bold" style={{ color: (client.solde_credit ?? 0) > 0 ? '#D97706' : '#1B4332' }}>
              {formatMontant(client.solde_credit ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #E5E7EB' }}>
        {onglets.map(o => (
          <button key={o.key}
            onClick={() => setOnglet(o.key as any)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13.5,
              background: 'none', fontWeight: onglet === o.key ? 700 : 400,
              color: onglet === o.key ? '#1B4332' : '#6B7280',
              borderBottom: onglet === o.key ? '2px solid #1B4332' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Ventes */}
      {onglet === 'ventes' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Date</th><th>Articles</th><th>Total</th><th>Statut</th></tr></thead>
              <tbody>
                {historique?.ventes?.map((v: any) => (
                  <tr key={v.id}>
                    <td className="text-sm">{formatDate(v.created_at)}</td>
                    <td>{v.nb_articles} article(s)</td>
                    <td className="font-bold">{formatMontant(v.total)}</td>
                    <td><span className={`badge ${statutVenteCouleur(v.statut)}`}>
                      {v.statut === 'CONFIRMEE' ? 'Confirmée' : 'Annulée'}
                    </span></td>
                  </tr>
                ))}
                {!historique?.ventes?.length && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>
                    Aucune vente
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Crédits */}
      {onglet === 'credits' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Date</th><th>Montant</th><th>Solde</th><th>Échéance</th><th>Statut</th></tr></thead>
              <tbody>
                {historique?.credits?.map((c: any) => (
                  <tr key={c.id}>
                    <td className="text-sm">{formatDate(c.created_at)}</td>
                    <td>{formatMontant(c.montant_total)}</td>
                    <td className="font-bold">{formatMontant(c.solde)}</td>
                    <td>{formatDate(c.date_echeance)}</td>
                    <td><span className={`badge ${statutCreditCouleur(c.statut)}`}>
                      {c.statut === 'EN_COURS' ? 'En cours' : c.statut === 'SOLDE' ? 'Soldé' : 'En retard'}
                    </span></td>
                  </tr>
                ))}
                {!historique?.credits?.length && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>
                    Aucun crédit
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Devis */}
      {onglet === 'devis' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Date</th><th>Total</th><th>Validité</th><th>Statut</th></tr></thead>
              <tbody>
                {historique?.devis?.map((d: any) => (
                  <tr key={d.id}>
                    <td className="text-sm">{formatDate(d.created_at)}</td>
                    <td className="font-bold">{formatMontant(d.total)}</td>
                    <td>{formatDate(d.date_validite)}</td>
                    <td><span className="badge badge-gray">{d.statut}</span></td>
                  </tr>
                ))}
                {!historique?.devis?.length && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>
                    Aucun devis
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prix négociés — responsable uniquement */}
      {onglet === 'prix' && isResponsable && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted">Prix spécifiques pour ce client professionnel</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPrixForm(true)}>
              + Ajouter un prix
            </button>
          </div>

          <div className="card" style={{ padding: 0, marginBottom: 16 }}>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Type</th><th>Article / Catégorie</th><th>Prix négocié</th><th></th></tr></thead>
                <tbody>
                  {client.prix_negocies?.map(pn => (
                    <tr key={pn.id}>
                      <td><span className={`badge ${pn.article_id ? 'badge-green' : 'badge-blue'}`}>
                        {pn.article_id ? 'Article' : 'Catégorie'}
                      </span></td>
                      <td className="font-bold">{pn.article_nom || pn.categorie_nom}</td>
                      <td style={{ color: '#1B4332', fontWeight: 700 }}>{formatMontant(pn.prix)}</td>
                      <td>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => { if (confirm('Supprimer ce prix négocié ?')) supprimerPrixMut.mutate(pn.id); }}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!client.prix_negocies?.length && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>
                      Aucun prix négocié — les prix publics s'appliquent
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formulaire prix négocié */}
          {showPrixForm && (
            <div className="card">
              <div className="card-title">Nouveau prix négocié</div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Article (optionnel)</label>
                  <select className="form-control" value={prixForm.article_id}
                    onChange={e => setPrixForm(f => ({ ...f, article_id: e.target.value, categorie_id: '' }))}>
                    <option value="">— Choisir un article —</option>
                    {articles?.filter(a => a.actif).map(a => (
                      <option key={a.id} value={a.id}>{a.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Catégorie (optionnel)</label>
                  <select className="form-control" value={prixForm.categorie_id}
                    onChange={e => setPrixForm(f => ({ ...f, categorie_id: e.target.value, article_id: '' }))}>
                    <option value="">— Choisir une catégorie —</option>
                    {categories?.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Prix négocié (FCFA) *</label>
                  <input type="number" min="0" className="form-control"
                    value={prixForm.prix}
                    onChange={e => setPrixForm(f => ({ ...f, prix: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary"
                  disabled={(!prixForm.article_id && !prixForm.categorie_id) || !prixForm.prix || prixMut.isPending}
                  onClick={() => prixMut.mutate({
                    article_id:   prixForm.article_id || undefined,
                    categorie_id: prixForm.categorie_id || undefined,
                    prix: parseFloat(prixForm.prix),
                  })}>
                  {prixMut.isPending ? <span className="spinner" /> : 'Enregistrer'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowPrixForm(false)}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
