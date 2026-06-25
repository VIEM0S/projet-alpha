import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { alerteService } from '../../services';

export default function Layout() {
  const { user, logout, isResponsable } = useAuth();
  const navigate = useNavigate();

  const { data: alertes } = useQuery({
    queryKey: ['alertes'],
    queryFn: alerteService.lister,
    refetchInterval: 60_000,
  });

  const nbAlertes = alertes?.length ?? 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Projet Alpha</h1>
          <p>Gestion Quincaillerie</p>
        </div>

        <nav className="sidebar-nav">
          {isResponsable && (
            <>
              <div className="nav-section">Vue globale</div>
              <NavLink to="/dashboard">📊 Tableau de bord</NavLink>
            </>
          )}

          <div className="nav-section">Gestion</div>
          <NavLink to="/ventes">🛒 Ventes</NavLink>
          <NavLink to="/devis">📋 Devis</NavLink>
          <NavLink to="/credits">💳 Crédits</NavLink>

          <div className="nav-section">Catalogue</div>
          <NavLink to="/articles">📦 Articles</NavLink>
          <NavLink to="/categories">🏷️ Catégories</NavLink>

          <div className="nav-section">Stock & Clients</div>
          <NavLink to="/stocks">
            📥 Mouvements stock
            {nbAlertes > 0 && (
              <span style={{
                marginLeft: 'auto', background: '#DC2626', color: '#fff',
                borderRadius: '10px', padding: '1px 7px', fontSize: '11px'
              }}>
                {nbAlertes}
              </span>
            )}
          </NavLink>
          <NavLink to="/clients">👥 Clients</NavLink>
        </nav>

        <div className="sidebar-user">
          <div className="user-name">{user?.prenom} {user?.nom}</div>
          <div className="user-role">{user?.role === 'RESPONSABLE' ? 'Responsable' : 'Gestionnaire'}</div>
          <button
            onClick={handleLogout}
            style={{ marginTop: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,.6)',
              cursor: 'pointer', fontSize: 12, padding: 0 }}
          >
            Se déconnecter →
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
