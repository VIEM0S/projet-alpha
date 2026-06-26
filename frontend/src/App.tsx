import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ArticlesPage from './pages/catalogue/ArticlesPage';
import CategoriesPage from './pages/catalogue/CategoriesPage';
import ClientsPage from './pages/clients/ClientsPage';
import ClientDetailPage from './pages/clients/ClientDetailPage';
import StocksPage from './pages/stocks/StocksPage';
import VentesPage from './pages/ventes/VentesPage';
import NouvelleVentePage from './pages/ventes/NouvelleVentePage';
import DevisPage from './pages/devis/DevisPage';
import NouveauDevisPage from './pages/devis/NouveauDevisPage';
import CreditsPage from './pages/credits/CreditsPage';
import UtilisateursPage from './pages/utilisateurs/UtilisateursPage';
import ProfilPage from './pages/profil/ProfilPage';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const ResponsableRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isResponsable } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isResponsable)   return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />

      <Route path="/" element={
        <PrivateRoute><Layout /></PrivateRoute>
      }>
        <Route index element={<Navigate to="/ventes" replace />} />

        {/* Dashboard — responsable uniquement */}
        <Route path="dashboard" element={
          <ResponsableRoute><DashboardPage /></ResponsableRoute>
        } />

        {/* Utilisateurs — responsable uniquement */}
        <Route path="utilisateurs" element={
          <ResponsableRoute><UtilisateursPage /></ResponsableRoute>
        } />

        {/* Profil */}
        <Route path="profil" element={<ProfilPage />} />

        {/* Catalogue */}
        <Route path="articles"   element={<ArticlesPage />} />
        <Route path="categories" element={<CategoriesPage />} />

        {/* Clients */}
        <Route path="clients"     element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />

        {/* Stocks */}
        <Route path="stocks" element={<StocksPage />} />

        {/* Ventes */}
        <Route path="ventes"          element={<VentesPage />} />
        <Route path="ventes/nouvelle" element={<NouvelleVentePage />} />

        {/* Devis */}
        <Route path="devis"         element={<DevisPage />} />
        <Route path="devis/nouveau" element={<NouveauDevisPage />} />

        {/* Crédits */}
        <Route path="credits" element={<CreditsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
