import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services';
import { formatMontant, formatDate, statutCreditCouleur } from '../../utils';

export default function DashboardPage() {
  const [debut, setDebut] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [fin, setFin] = useState(() => new Date().toISOString().split('T')[0]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', debut, fin],
    queryFn: () => dashboardService.get({ debut, fin }),
  });

  if (isLoading) return <div className="loading-center"><span className="spinner" /></div>;
  if (error)     return <div className="page"><div className="alert alert-error">Erreur de chargement</div></div>;
  if (!data)     return null;

  const tauxMarge = data.ca.total > 0 ? ((data.marge.totale / data.ca.total) * 100).toFixed(1) : '0';

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Tableau de bord</h2>
        <div className="flex gap-2 items-center">
          <span className="text-muted text-sm">Période :</span>
          <input type="date" className="form-control" style={{ width: 'auto' }}
            value={debut} onChange={e => setDebut(e.target.value)} />
          <span className="text-muted">→</span>
          <input type="date" className="form-control" style={{ width: 'auto' }}
            value={fin} onChange={e => setFin(e.target.value)} />
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">CA Aujourd'hui</div>
          <div className="stat-value">{formatMontant(data.ca.jour)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CA du mois</div>
          <div className="stat-value">{formatMontant(data.ca.mois)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CA sur la période</div>
          <div className="stat-value">{formatMontant(data.ca.total)}</div>
          <div className="stat-sub">{data.ca.nb_ventes} vente(s)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Marge sur la période</div>
          <div className="stat-value">{formatMontant(data.marge.totale)}</div>
          <div className="stat-sub">{tauxMarge}% du CA</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Valeur du stock</div>
          <div className="stat-value">{formatMontant(data.stock.valeur_totale)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Alertes stock</div>
          <div className="stat-value" style={{ color: data.stock.alertes.length > 0 ? '#DC2626' : '#1B4332' }}>
            {data.stock.alertes.length}
          </div>
          <div className="stat-sub">{data.stock.alertes.filter(a => a.type === 'RUPTURE').length} rupture(s)</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Alertes stock */}
        {data.stock.alertes.length > 0 && (
          <div className="card">
            <div className="card-title">⚠️ Alertes stock</div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Article</th><th>Type</th><th>Stock</th></tr>
                </thead>
                <tbody>
                  {data.stock.alertes.map(a => (
                    <tr key={a.id}>
                      <td>{a.article_nom}</td>
                      <td>
                        <span className={`badge ${a.type === 'RUPTURE' ? 'badge-red' : 'badge-orange'}`}>
                          {a.type === 'RUPTURE' ? 'Rupture' : 'Stock bas'}
                        </span>
                      </td>
                      <td className={a.type === 'RUPTURE' ? 'stock-rupture' : 'stock-bas'}>
                        {a.stock_actuel} {a.unite_mesure}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Crédits en cours */}
        {data.credits_en_cours.length > 0 && (
          <div className="card">
            <div className="card-title">💳 Crédits en cours</div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Client</th><th>Solde</th><th>Échéance</th></tr>
                </thead>
                <tbody>
                  {data.credits_en_cours.map(c => (
                    <tr key={c.id}>
                      <td>{c.client_nom}</td>
                      <td className="font-bold">{formatMontant(c.solde)}</td>
                      <td>
                        <span className={`badge ${statutCreditCouleur(c.statut)}`}>
                          {formatDate(c.date_echeance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="grid-2 mt-4">
        {/* Top articles */}
        <div className="card">
          <div className="card-title">🏆 Top articles vendus</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>#</th><th>Article</th><th>Qté</th><th>CA</th><th>Marge</th></tr>
              </thead>
              <tbody>
                {data.top_articles.map((a, i) => (
                  <tr key={a.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td>{a.nom}</td>
                    <td>{a.qte_vendue} {a.unite_mesure}</td>
                    <td>{formatMontant(a.ca)}</td>
                    <td style={{ color: '#1B4332', fontWeight: 600 }}>{formatMontant(a.marge)}</td>
                  </tr>
                ))}
                {data.top_articles.length === 0 && (
                  <tr><td colSpan={5} className="text-muted text-center">Aucune vente sur la période</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Marge par catégorie */}
        <div className="card">
          <div className="card-title">📂 Marge par catégorie</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Catégorie</th><th>CA</th><th>Marge</th></tr>
              </thead>
              <tbody>
                {data.marge.par_categorie.map((c, i) => (
                  <tr key={i}>
                    <td>{c.categorie}</td>
                    <td>{formatMontant(c.ca)}</td>
                    <td style={{ color: '#1B4332', fontWeight: 600 }}>{formatMontant(c.marge)}</td>
                  </tr>
                ))}
                {data.marge.par_categorie.length === 0 && (
                  <tr><td colSpan={3} className="text-muted text-center">Aucune donnée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Performance gestionnaires */}
      <div className="card mt-4">
        <div className="card-title">👤 Performance par gestionnaire</div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Gestionnaire</th><th>Nb ventes</th><th>Total ventes</th></tr>
            </thead>
            <tbody>
              {data.gestionnaires.map(g => (
                <tr key={g.id}>
                  <td>{g.prenom} {g.nom}</td>
                  <td>{g.nb_ventes}</td>
                  <td className="font-bold">{formatMontant(g.total_ventes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
