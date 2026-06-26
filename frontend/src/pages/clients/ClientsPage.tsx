import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../../services';
import { formatMontant, labelTypeClient } from '../../utils';
import type { Client } from '../../types';

export default function ClientsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ nom: '', telephone: '', adresse: '', type: 'PARTICULIER' });
  const [error, setError] = useState('');

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientService.lister({ search: search || undefined }),
  });

  const createMut = useMutation({ mutationFn: clientService.creer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); resetForm(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur') });

  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => clientService.modifier(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); resetForm(); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur') });

  const resetForm = () => { setShowForm(false); setEditClient(null); setError('');
    setForm({ nom: '', telephone: '', adresse: '', type: 'PARTICULIER' }); };

  const openEdit = (c: Client) => {
    setEditClient(c); setForm({ nom: c.nom, telephone: c.telephone || '', adresse: c.adresse || '', type: c.type });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (editClient) updateMut.mutate({ id: editClient.id, data: form });
    else createMut.mutate(form);
  };

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Clients</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nouveau client</button>
      </div>
      <div className="search-bar">
        <input className="search-input" placeholder="Rechercher par nom ou téléphone..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {isLoading ? <div className="loading-center"><span className="spinner" /></div> : (
            <table>
              <thead><tr><th>Nom</th><th>Type</th><th>Téléphone</th><th>Solde crédit</th><th></th></tr></thead>
              <tbody>
                {clients?.map(c => (
                  <tr key={c.id}>
                    <td className="font-bold">{c.nom}</td>
                    <td><span className={`badge ${c.type === 'PROFESSIONNEL' ? 'badge-blue' : 'badge-gray'}`}>
                      {labelTypeClient(c.type)}</span></td>
                    <td>{c.telephone || '—'}</td>
                    <td style={{ color: (c.solde_credit ?? 0) > 0 ? '#D97706' : undefined }}>
                      {(c.solde_credit ?? 0) > 0 ? formatMontant(c.solde_credit!) : '—'}
                    </td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => navigate(`/clients/${c.id}`)}>Voir détail</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Modifier</button></td>
                  </tr>
                ))}
                {!clients?.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>Aucun client</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editClient ? 'Modifier client' : 'Nouveau client'}</span>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Nom / Raison sociale *</label>
                  <input className="form-control" value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select className="form-control" value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="PARTICULIER">Particulier</option>
                      <option value="PROFESSIONNEL">Professionnel</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input className="form-control" value={form.telephone}
                      onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Adresse</label>
                  <textarea className="form-control" rows={2} value={form.adresse}
                    onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
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
