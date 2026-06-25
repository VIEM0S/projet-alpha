import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, isResponsable } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: '', mot_de_passe: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.login, form.mot_de_passe);
      navigate(isResponsable ? '/dashboard' : '/ventes');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Projet Alpha</h1>
        <p>Gestion de la Quincaillerie</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Identifiant</label>
            <input
              className="form-control"
              type="text"
              value={form.login}
              onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
              placeholder="Votre identifiant"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              className="form-control"
              type="password"
              value={form.mot_de_passe}
              onChange={e => setForm(f => ({ ...f, mot_de_passe: e.target.value }))}
              placeholder="Votre mot de passe"
              required
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {loading ? <span className="spinner" /> : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
