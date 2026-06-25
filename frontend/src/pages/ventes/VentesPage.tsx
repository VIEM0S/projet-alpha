import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { venteService } from '../../services';
import { formatMontant, formatDateHeure, statutVenteCouleur, labelModePaiement } from '../../utils';
import type { Vente } from '../../types';

export default function VentesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [showAnnuler, setShowAnnuler] = useState(false);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreDebut, setFiltreDebut] = useState('');
  const [filtreFin, setFiltreFin] = useState('');

  const { data: ventes, isLoading } = useQuery({
    queryKey: ['ventes', filtreStatut, filtreDebut, filtreFin],
    queryFn: () => venteService.lister({
      statut: filtreStatut || undefined,
      debut: filtreDebut || undefined,
      fin: filtreFin || undefined,
    }),
  });

  const { data: venteDetail } = useQuery({
    queryKey: ['vente', selectedVente?.id],
    queryFn: () => venteService.getById(selectedVente!.id),
    enabled: !!selectedVente,
  });

  const annulerMut = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) => venteService.annuler(id, motif),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventes'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      setShowAnnuler(false);
      setSelectedVente(null);
      setMotifAnnulation('');
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Erreur'),
  });

  const totalVentes = ventes?.filter(v => v.statut === 'CONFIRMEE').reduce((s, v) => s + Number(v.total), 0) ?? 0;

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Ventes</h2>
        <button className="btn btn-primary" onClick={() => navigate('/ventes/nouvelle')}>
          + Nouvelle vente
        </button>
      </div>

      {/* Filtres */}
      <div className="search-bar mb-4">
        <select className="form-control" style={{ width: 'auto' }}
          value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="CONFIRMEE">Confirmée</option>
          <option value="ANNULEE">Annulée</option>
        </select>
        <input type="date" className="form-control" style={{ width: 'auto' }}
          value={filtreDebut} onChange={e => setFiltreDebut(e.target.value)} />
        <span className="text-muted">→</span>
        <input type="date" className="form-control" style={{ width: 'auto' }}
          value={filtreFin} onChange={e => setFiltreFin(e.target.value)} />
        {(filtreStatut || filtreDebut || filtreFin) && (
          <button className="btn btn-secondary btn-sm"
            onClick={() => { setFiltreStatut(''); setFiltreDebut(''); setFiltreFin(''); }}>
            Réinitialiser
          </button>
        )}
      </div>

      {/* Résumé */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Total affiché</div>
          <div className="stat-value">{formatMontant(totalVentes)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Nb ventes confirmées</div>
          <div className="stat-value">{ventes?.filter(v => v.statut === 'CONFIRMEE').length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Nb ventes annulées</div>
          <div className="stat-value">{ventes?.filter(v => v.statut === 'ANNULEE').length ?? 0}</div>
        </div>
      </div>

      <div className={selectedVente ? 'grid-2' : ''} style={{ alignItems: 'flex-start' }}>
        {/* Liste */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            {isLoading ? (
              <div className="loading-center"><span className="spinner" /></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Client</th><th>Articles</th>
                    <th>Total</th><th>Paiement</th><th>Statut</th><th>Gestionnaire</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {ventes?.map(v => (
                    <tr key={v.id}
                      style={{ cursor: 'pointer', background: selectedVente?.id === v.id ? 'var(--vert-pale)' : undefined }}
                      onClick={() => setSelectedVente(v)}>
                      <td className="text-sm">{formatDateHeure(v.created_at)}</td>
                      <td>{v.client_nom || <span className="text-muted">Anonyme</span>}</td>
                      <td className="text-muted">{v.nb_articles}</td>
                      <td className="font-bold">{formatMontant(v.total)}</td>
                      <td>{labelModePaiement(v.mode_paiement)}</td>
                      <td>
                        <span className={`badge ${statutVenteCouleur(v.statut)}`}>
                          {v.statut === 'CONFIRMEE' ? 'Confirmée' : 'Annulée'}
                        </span>
                      </td>
                      <td className="text-sm">{v.gestionnaire_prenom} {v.gestionnaire_nom}</td>
                      <td>
                        {v.statut === 'CONFIRMEE' && (
                          <button className="btn btn-danger btn-sm"
                            onClick={e => { e.stopPropagation(); setSelectedVente(v); setShowAnnuler(true); }}>
                            Annuler
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!ventes?.length && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>
                      Aucune vente
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Détail vente */}
        {selectedVente && venteDetail && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="card-title" style={{ marginBottom: 0 }}>Détail de la vente</div>
              <button onClick={() => setSelectedVente(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6B7280' }}>×</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div className="text-muted text-sm">Client</div>
              <div className="font-bold">{venteDetail.client_nom || 'Vente anonyme'}</div>
            </div>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div><div className="text-muted text-sm">Date</div>
                <div>{formatDateHeure(venteDetail.created_at)}</div></div>
              <div><div className="text-muted text-sm">Mode paiement</div>
                <div>{labelModePaiement(venteDetail.mode_paiement)}</div></div>
            </div>

            {/* Lignes */}
            <table style={{ marginBottom: 12 }}>
              <thead>
                <tr><th>Article</th><th>Qté</th><th>Prix unit.</th><th>Sous-total</th></tr>
              </thead>
              <tbody>
                {venteDetail.lignes?.map(l => (
                  <tr key={l.id}>
                    <td>
                      {l.article_nom}
                      {l.prix_modifie && <span className="badge badge-orange" style={{ marginLeft: 6 }}>Prix modifié</span>}
                    </td>
                    <td>{l.quantite} {l.unite_mesure}</td>
                    <td>{formatMontant(l.prix_unitaire)}</td>
                    <td className="font-bold">{formatMontant(l.sous_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 12, textAlign: 'right' }}>
              <span className="text-muted">Total : </span>
              <span className="font-bold" style={{ fontSize: 18 }}>{formatMontant(venteDetail.total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal annulation */}
      {showAnnuler && selectedVente && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Annuler la vente</span>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning">
                Cette action réintégrera les articles en stock. Elle est possible uniquement dans les 24h.
              </div>
              <div className="form-group">
                <label className="form-label">Motif d'annulation *</label>
                <input className="form-control" value={motifAnnulation}
                  onChange={e => setMotifAnnulation(e.target.value)}
                  placeholder="Ex: Erreur de saisie, client a changé d'avis..." required />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary"
                onClick={() => { setShowAnnuler(false); setMotifAnnulation(''); }}>
                Annuler
              </button>
              <button className="btn btn-danger"
                disabled={!motifAnnulation.trim() || annulerMut.isPending}
                onClick={() => annulerMut.mutate({ id: selectedVente.id, motif: motifAnnulation })}>
                {annulerMut.isPending ? <span className="spinner" /> : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
