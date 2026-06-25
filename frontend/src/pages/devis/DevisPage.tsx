import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devisService } from '../../services';
import { formatMontant, formatDate, statutDevisCouleur } from '../../utils';
import type { Devis } from '../../types';

export default function DevisPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedDevis, setSelectedDevis] = useState<Devis | null>(null);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [showConvertir, setShowConvertir] = useState(false);
  const [modeConvert, setModeConvert] = useState<'ESPECES' | 'MOBILE_MONEY' | 'CREDIT'>('ESPECES');

  const { data: devisList, isLoading } = useQuery({
    queryKey: ['devis', filtreStatut],
    queryFn: () => devisService.lister({ statut: filtreStatut || undefined }),
  });

  const { data: devisDetail } = useQuery({
    queryKey: ['devis-detail', selectedDevis?.id],
    queryFn: () => devisService.getById(selectedDevis!.id),
    enabled: !!selectedDevis,
  });

  const statutMut = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: string }) => devisService.changerStatut(id, statut),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['devis'] }); setSelectedDevis(null); },
    onError: (e: any) => alert(e.response?.data?.message || 'Erreur'),
  });

  const convertirMut = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: string }) => devisService.convertir(id, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devis'] });
      qc.invalidateQueries({ queryKey: ['ventes'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      setShowConvertir(false);
      setSelectedDevis(null);
      navigate('/ventes');
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Erreur'),
  });

  const labelStatut = (s: string) => ({
    EN_ATTENTE: 'En attente', ACCEPTE: 'Accepté',
    CONVERTI: 'Converti', REFUSE: 'Refusé', EXPIRE: 'Expiré',
  }[s] || s);

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Devis</h2>
        <button className="btn btn-primary" onClick={() => navigate('/devis/nouveau')}>
          + Nouveau devis
        </button>
      </div>

      {/* Filtre statut */}
      <div className="search-bar mb-4">
        {(['', 'EN_ATTENTE', 'ACCEPTE', 'CONVERTI', 'REFUSE', 'EXPIRE'] as const).map(s => (
          <button key={s}
            className={`btn btn-sm ${filtreStatut === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltreStatut(s)}>
            {s === '' ? 'Tous' : labelStatut(s)}
          </button>
        ))}
      </div>

      <div className={selectedDevis ? 'grid-2' : ''} style={{ alignItems: 'flex-start' }}>
        {/* Liste */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            {isLoading ? (
              <div className="loading-center"><span className="spinner" /></div>
            ) : (
              <table>
                <thead>
                  <tr><th>Date</th><th>Client</th><th>Total</th><th>Validité</th><th>Statut</th><th>Gestionnaire</th></tr>
                </thead>
                <tbody>
                  {devisList?.map(d => (
                    <tr key={d.id}
                      style={{ cursor: 'pointer', background: selectedDevis?.id === d.id ? 'var(--vert-pale)' : undefined }}
                      onClick={() => setSelectedDevis(d)}>
                      <td className="text-sm">{formatDate(d.created_at)}</td>
                      <td className="font-bold">{d.client_nom}</td>
                      <td>{formatMontant(d.total)}</td>
                      <td className="text-sm">{formatDate(d.date_validite)}</td>
                      <td>
                        <span className={`badge ${statutDevisCouleur(d.statut)}`}>
                          {labelStatut(d.statut)}
                        </span>
                      </td>
                      <td className="text-sm">{d.gestionnaire_nom}</td>
                    </tr>
                  ))}
                  {!devisList?.length && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>
                      Aucun devis
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Détail devis */}
        {selectedDevis && devisDetail && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="card-title" style={{ marginBottom: 0 }}>Détail du devis</div>
              <button onClick={() => setSelectedDevis(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6B7280' }}>×</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div className="text-muted text-sm">Client</div>
              <div className="font-bold">{devisDetail.client_nom}</div>
            </div>
            <div className="grid-2 mb-4">
              <div><div className="text-muted text-sm">Validité</div>
                <div>{formatDate(devisDetail.date_validite)}</div></div>
              <div><div className="text-muted text-sm">Statut</div>
                <span className={`badge ${statutDevisCouleur(devisDetail.statut)}`}>
                  {labelStatut(devisDetail.statut)}
                </span>
              </div>
            </div>

            {devisDetail.note && (
              <div className="alert" style={{ background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB', marginBottom: 12 }}>
                📝 {devisDetail.note}
              </div>
            )}

            {/* Lignes */}
            <table style={{ marginBottom: 12 }}>
              <thead>
                <tr><th>Article</th><th>Qté</th><th>Prix unit.</th><th>Sous-total</th></tr>
              </thead>
              <tbody>
                {devisDetail.lignes?.map(l => (
                  <tr key={l.id}>
                    <td>{l.article_nom}</td>
                    <td>{l.quantite} {l.unite_mesure}</td>
                    <td>{formatMontant(l.prix_unitaire)}</td>
                    <td className="font-bold">{formatMontant(l.sous_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 8, textAlign: 'right', marginBottom: 16 }}>
              <span className="text-muted">Total : </span>
              <span className="font-bold" style={{ fontSize: 18 }}>{formatMontant(devisDetail.total)}</span>
            </div>

            {/* Actions selon statut */}
            {devisDetail.statut === 'EN_ATTENTE' && (
              <div className="flex gap-2">
                <button className="btn btn-primary"
                  onClick={() => statutMut.mutate({ id: devisDetail.id, statut: 'ACCEPTE' })}>
                  ✓ Marquer accepté
                </button>
                <button className="btn btn-danger"
                  onClick={() => { if (confirm('Marquer ce devis comme refusé ?')) statutMut.mutate({ id: devisDetail.id, statut: 'REFUSE' }); }}>
                  ✗ Refuser
                </button>
              </div>
            )}

            {devisDetail.statut === 'ACCEPTE' && (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowConvertir(true)}>
                🔄 Convertir en vente
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal conversion */}
      {showConvertir && selectedDevis && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Convertir le devis en vente</span>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Mode de paiement</label>
                <select className="form-control" value={modeConvert}
                  onChange={e => setModeConvert(e.target.value as any)}>
                  <option value="ESPECES">Espèces</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CREDIT">Crédit</option>
                </select>
              </div>
              <div className="alert alert-warning">
                Cette action est irréversible. Le stock sera déduit immédiatement.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConvertir(false)}>Annuler</button>
              <button className="btn btn-primary"
                disabled={convertirMut.isPending}
                onClick={() => convertirMut.mutate({ id: selectedDevis.id, mode: modeConvert })}>
                {convertirMut.isPending ? <span className="spinner" /> : 'Confirmer la conversion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
