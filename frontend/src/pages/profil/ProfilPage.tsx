import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function ProfilPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ ancien: '', nouveau: '', confirmer: '' });
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (form.nouveau.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (form.nouveau !== form.confirmer) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/auth/mot-de-passe', {
        ancien_mot_de_passe: form.ancien,
        nouveau_mot_de_passe: form.nouveau,
      });
      setSuccess('Mot de passe modifié avec succès');
      setForm({ ancien: '', nouveau: '', confirmer: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du changement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Mon profil</h2>

      <div style={{ maxWidth: 480 }}>
        {/* Infos */}
        <div className="card mb-4">
          <div className="card-title">Informations du compte</div>
          <div className="grid-2">
            <div>
              <div className="text-muted text-sm">Nom complet</div>
              <div className="font-bold">{user?.prenom} {user?.nom}</div>
            </div>
            <div>
              <div className="text-muted text-sm">Login</div>
              <div className="font-bold">{user?.login}</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="text-muted text-sm">Rôle</div>
            <span className={`badge ${user?.role === 'RESPONSABLE' ? 'badge-blue' : 'badge-green'}`}>
              {user?.role === 'RESPONSABLE' ? 'Responsable' : 'Gestionnaire'}
            </span>
          </div>
        </div>

        {/* Changer mot de passe */}
        <div className="card">
          <div className="card-title">Changer le mot de passe</div>
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Mot de passe actuel *</label>
              <input type="password" className="form-control"
                value={form.ancien}
                onChange={e => setForm(f => ({ ...f, ancien: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nouveau mot de passe *</label>
              <input type="password" className="form-control"
                value={form.nouveau}
                onChange={e => setForm(f => ({ ...f, nouveau: e.target.value }))}
                placeholder="Minimum 6 caractères" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmer le nouveau mot de passe *</label>
              <input type="password" className="form-control"
                value={form.confirmer}
                onChange={e => setForm(f => ({ ...f, confirmer: e.target.value }))} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Changer le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
