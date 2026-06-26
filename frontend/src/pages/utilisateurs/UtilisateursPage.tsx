import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services';
import type { Utilisateur } from '../../types';

export default function UtilisateursPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    nom: '', prenom: '', login: '', mot_de_passe: '', role: 'GESTIONNAIRE',
  });

  const { data: utilisateurs, isLoading } = useQuery({
    queryKey: ['utilisateurs'],
    queryFn: authService.listerUtilisateurs,
  });

  const createMut = useMutation({
    mutationFn: authService.creerUtilisateur,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilisateurs'] });
      setForm({ nom: '', prenom: '', login: '', mot_de_passe: '', role: 'GESTIONNAIRE' });
      setShowForm(false);
      setSuccess('Compte créé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur lors de la création'),
  });

  const toggleMut = useMutation({
    mutationFn: authService.toggleActif,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['utilisateurs'] }),
    onError: (e: any) => alert(e.response?.data?.message || 'Erreur'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.mot_de_passe.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    createMut.mutate(form);
  };

  const resetForm = () => {
    setShowForm(false);
    setError('');
    setForm({ nom: '', prenom: '', login: '', mot_de_passe: '', role: 'GESTIONNAIRE' });
  };

  const gestionnaires = utilisateurs?.filter(u => u.role === 'GESTIONNAIRE') ?? [];
  const responsables  = utilisateurs?.filter(u => u.role === 'RESPONSABLE') ?? [];

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Gestion des utilisateurs</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Nouveau compte
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      {/* Responsables */}
      <div className="card mb-4">
        <div className="card-title">Responsables ({responsables.length})</div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Nom</th><th>Login</th><th>Statut</th><th>Créé le</th></tr>
            </thead>
            <tbody>
              {responsables.map(u => (
                <tr key={u.id}>
                  <td className="font-bold">{u.prenom} {u.nom}</td>
                  <td className="text-muted">{u.login}</td>
                  <td>
                    <span className={`badge ${u.actif ? 'badge-green' : 'badge-gray'}`}>
                      {u.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gestionnaires */}
      <div className="card">
        <div className="card-title">Gestionnaires ({gestionnaires.length})</div>
        {isLoading ? (
          <div className="loading-center"><span className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Nom</th><th>Login</th><th>Statut</th><th>Créé le</th><th></th></tr>
              </thead>
              <tbody>
                {gestionnaires.map(u => (
                  <tr key={u.id}>
                    <td className="font-bold">{u.prenom} {u.nom}</td>
                    <td className="text-muted">{u.login}</td>
                    <td>
                      <span className={`badge ${u.actif ? 'badge-green' : 'badge-gray'}`}>
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {new Date(u.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.actif ? 'btn-danger' : 'btn-secondary'}`}
                        disabled={toggleMut.isPending}
                        onClick={() => {
                          const action = u.actif ? 'désactiver' : 'activer';
                          if (confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} le compte de ${u.prenom} ${u.nom} ?`)) {
                            toggleMut.mutate(u.id);
                          }
                        }}>
                        {u.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
                {gestionnaires.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#6B7280' }}>
                      Aucun gestionnaire — créez le premier compte ci-dessus
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal création */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nouveau compte utilisateur</span>
              <button onClick={resetForm}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Prénom *</label>
                    <input className="form-control" value={form.prenom}
                      onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input className="form-control" value={form.nom}
                      onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Login *</label>
                    <input className="form-control" value={form.login}
                      onChange={e => setForm(f => ({ ...f, login: e.target.value.toLowerCase().trim() }))}
                      placeholder="ex: amadou.coulibaly" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rôle *</label>
                    <select className="form-control" value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="GESTIONNAIRE">Gestionnaire</option>
                      <option value="RESPONSABLE">Responsable</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mot de passe *</label>
                  <input type="password" className="form-control" value={form.mot_de_passe}
                    onChange={e => setForm(f => ({ ...f, mot_de_passe: e.target.value }))}
                    placeholder="Minimum 6 caractères" required />
                </div>

                <div className="alert"
                  style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                  ℹ️ Communiquez le login et le mot de passe à l'utilisateur. Il pourra le changer depuis son profil.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>
                  {createMut.isPending ? <span className="spinner" /> : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
