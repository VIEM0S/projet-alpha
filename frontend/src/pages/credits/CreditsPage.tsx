import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creditService } from '../../services';
import { formatMontant, formatDate, formatDateHeure, statutCreditCouleur, echeanceProche } from '../../utils';
import type { Credit } from '../../types';

export default function CreditsPage() {
  const qc = useQueryClient();
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [filtreStatut, setFiltreStatut] = useState('EN_COURS');
  const [montantVersement, setMontantVersement] = useState('');
  const [error, setError] = useState('');

  const { data: credits, isLoading } = useQuery({
    queryKey: ['credits', filtreStatut],
    queryFn: () => creditService.lister({ statut: filtreStatut || undefined }),
  });

  const { data: creditDetail } = useQuery({
    queryKey: ['credit-detail', selectedCredit?.id],
    queryFn: () => creditService.getById(selectedCredit!.id),
    enabled: !!selectedCredit,
  });

  const { data: echeances } = useQuery({
    queryKey: ['echeances'],
    queryFn: creditService.echeances,
    refetchInterval: 60_000,
  });

  const versementMut = useMutation({
    mutationFn: ({ id, montant }: { id: string; montant: number }) =>
      creditService.versement(id, montant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] });
      qc.invalidateQueries({ queryKey: ['credit-detail', selectedCredit?.id] });
      setMontantVersement('');
      setError('');
    },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur'),
  });

  const labelStatut = (s: string) => ({
    EN_COURS: 'En cours', SOLDE: 'Soldé', EN_RETARD: 'En retard',
  }[s] || s);

  const totalEnCours = credits?.filter(c => c.statut === 'EN_COURS')
    .reduce((s, c) => s + Number(c.solde), 0) ?? 0;

  return (
    <div className="page">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Crédits clients</h2>

      {/* Alertes échéances proches */}
      {echeances && echeances.length > 0 && (
        <div className="alert alert-warning mb-4">
          ⏰ <strong>{echeances.length} crédit(s)</strong> arrivent à échéance dans moins de 48h :
          {echeances.map(c => ` ${c.client_nom} (${formatMontant(c.solde)})`).join(',')}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Total en cours</div>
          <div className="stat-value" style={{ color: '#D97706' }}>{formatMontant(totalEnCours)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Nb crédits actifs</div>
          <div className="stat-value">{credits?.filter(c => c.statut === 'EN_COURS').length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Échéances &lt; 48h</div>
          <div className="stat-value" style={{ color: (echeances?.length ?? 0) > 0 ? '#DC2626' : undefined }}>
            {echeances?.length ?? 0}
          </div>
        </div>
      </div>

      {/* Filtre statut */}
      <div className="flex gap-2 mb-4">
        {[
          { val: 'EN_COURS', label: 'En cours' },
          { val: 'EN_RETARD', label: 'En retard' },
          { val: 'SOLDE', label: 'Soldés' },
          { val: '', label: 'Tous' },
        ].map(opt => (
          <button key={opt.val}
            className={`btn btn-sm ${filtreStatut === opt.val ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltreStatut(opt.val)}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className={selectedCredit ? 'grid-2' : ''} style={{ alignItems: 'flex-start' }}>
        {/* Liste */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            {isLoading ? (
              <div className="loading-center"><span className="spinner" /></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Client</th><th>Montant initial</th><th>Solde restant</th>
                    <th>Échéance</th><th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {credits?.map(c => (
                    <tr key={c.id}
                      style={{
                        cursor: 'pointer',
                        background: selectedCredit?.id === c.id ? 'var(--vert-pale)' : undefined,
                      }}
                      onClick={() => setSelectedCredit(c)}>
                      <td className="font-bold">{c.client_nom}</td>
                      <td>{formatMontant(c.montant_total)}</td>
                      <td style={{ fontWeight: 700, color: c.statut === 'EN_COURS' ? '#D97706' : undefined }}>
                        {formatMontant(c.solde)}
                      </td>
                      <td>
                        <span style={{ color: echeanceProche(c.date_echeance) && c.statut === 'EN_COURS' ? '#DC2626' : undefined }}>
                          {formatDate(c.date_echeance)}
                          {echeanceProche(c.date_echeance) && c.statut === 'EN_COURS' && ' ⚠️'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statutCreditCouleur(c.statut)}`}>
                          {labelStatut(c.statut)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!credits?.length && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>
                      Aucun crédit
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Détail crédit */}
        {selectedCredit && creditDetail && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="card-title" style={{ marginBottom: 0 }}>Détail du crédit</div>
              <button onClick={() => { setSelectedCredit(null); setError(''); setMontantVersement(''); }}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6B7280' }}>×</button>
            </div>

            {/* Infos */}
            <div style={{ marginBottom: 12 }}>
              <div className="text-muted text-sm">Client</div>
              <div className="font-bold" style={{ fontSize: 16 }}>{creditDetail.client_nom}</div>
            </div>

            <div className="grid-2 mb-4">
              <div>
                <div className="text-muted text-sm">Montant initial</div>
                <div className="font-bold">{formatMontant(creditDetail.montant_total)}</div>
              </div>
              <div>
                <div className="text-muted text-sm">Acompte versé</div>
                <div>{formatMontant(creditDetail.acompte)}</div>
              </div>
            </div>

            {/* Solde en grand */}
            <div style={{
              background: creditDetail.statut === 'SOLDE' ? 'var(--vert-light)' : 'var(--orange-light)',
              border: `1px solid ${creditDetail.statut === 'SOLDE' ? '#6ee7b7' : '#fcd34d'}`,
              borderRadius: 8, padding: '12px 16px', marginBottom: 16, textAlign: 'center',
            }}>
              <div className="text-sm" style={{ marginBottom: 4 }}>Solde restant</div>
              <div style={{ fontSize: 28, fontWeight: 800,
                color: creditDetail.statut === 'SOLDE' ? '#1B4332' : '#D97706' }}>
                {formatMontant(creditDetail.solde)}
              </div>
              <div className="text-sm">{labelStatut(creditDetail.statut)} — Échéance : {formatDate(creditDetail.date_echeance)}</div>
            </div>

            {/* Formulaire versement */}
            {creditDetail.statut === 'EN_COURS' && (
              <div style={{ marginBottom: 16 }}>
                <div className="card-title">Enregistrer un versement</div>
                {error && <div className="alert alert-error">{error}</div>}
                <div className="flex gap-2 items-center">
                  <input
                    type="number" min="1" max={creditDetail.solde}
                    className="form-control"
                    placeholder={`Max : ${formatMontant(creditDetail.solde)}`}
                    value={montantVersement}
                    onChange={e => setMontantVersement(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    disabled={!montantVersement || parseFloat(montantVersement) <= 0 || versementMut.isPending}
                    onClick={() => versementMut.mutate({ id: creditDetail.id, montant: parseFloat(montantVersement) })}>
                    {versementMut.isPending ? <span className="spinner" /> : '✓ Valider'}
                  </button>
                </div>
              </div>
            )}

            {/* Historique des versements */}
            <div className="card-title">Historique des versements</div>
            <div className="table-wrapper" style={{ maxHeight: 220, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Date</th><th>Montant</th><th>Solde après</th><th>Gestionnaire</th></tr>
                </thead>
                <tbody>
                  {creditDetail.versements?.map(v => (
                    <tr key={v.id}>
                      <td className="text-sm">{formatDateHeure(v.created_at)}</td>
                      <td className="font-bold" style={{ color: '#1B4332' }}>{formatMontant(v.montant)}</td>
                      <td>{formatMontant(v.solde_apres)}</td>
                      <td className="text-sm">{v.gestionnaire_nom}</td>
                    </tr>
                  ))}
                  {!creditDetail.versements?.length && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#6B7280' }}>
                      Aucun versement enregistré
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
