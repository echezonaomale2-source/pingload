import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModalProvider } from './context/ModalContext';
import { ToastProvider } from './context/ToastContext';
import LoadingProvider from './context/LoadingProvider';
import { PageLoader } from './components/loading';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import UserDetails from './pages/UserDetails';
import TransactionsPage from './pages/Transactions';
import TransactionDetails from './pages/TransactionDetails';
import RefundsPage from './pages/Refunds';
import RefundDetails from './pages/RefundDetails';
import WalletsPage from './pages/Wallets';
import ServicesPage from './pages/Services';
import NotificationsPage from './pages/Notifications';
import ReferralsPage from './pages/Referrals';
import SupportPage from './pages/Support';
import SettingsPage from './pages/Settings';
import KycPage from './pages/Kyc';
import FaqPage from './pages/Faq';
import ServicePricesPage from './pages/ServicePrices';
import DataPlansPage from './pages/DataPlans';
import ElectricityPlansPage from './pages/ElectricityPlans';
import TvPlansPage from './pages/TvPlans';
import EducationProductsPage from './pages/EducationProducts';
import BettingPlatformsPage from './pages/BettingPlatforms';
import ProviderLogosPage from './pages/ProviderLogos';
import RevenuePage from './pages/Revenue';
import SecurityEventsPage from './pages/SecurityEvents';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader message="Loading Dashboard..." />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
      <Route index element={<Dashboard />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="users/:id" element={<UserDetails />} />
      <Route path="transactions" element={<TransactionsPage />} />
      <Route path="transactions/:id" element={<TransactionDetails />} />
      <Route path="refunds" element={<RefundsPage />} />
      <Route path="refunds/:id" element={<RefundDetails />} />
      <Route path="wallets" element={<WalletsPage />} />
      <Route path="services" element={<ServicesPage />} />
      <Route path="service-prices" element={<ServicePricesPage />} />
      <Route path="data-plans" element={<DataPlansPage />} />
      <Route path="electricity-plans" element={<ElectricityPlansPage />} />
      <Route path="tv-plans" element={<TvPlansPage />} />
      <Route path="education-products" element={<EducationProductsPage />} />
      <Route path="betting-platforms" element={<BettingPlatformsPage />} />
      <Route path="provider-logos" element={<ProviderLogosPage />} />
      <Route path="revenue" element={<RevenuePage />} />
      <Route path="security-events" element={<SecurityEventsPage />} />
      <Route path="kyc" element={<KycPage />} />
      <Route path="faq" element={<FaqPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="referrals" element={<ReferralsPage />} />
      <Route path="support" element={<SupportPage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <ModalProvider>
          <ToastProvider>
            <LoadingProvider>
              <AppRoutes />
            </LoadingProvider>
          </ToastProvider>
        </ModalProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;
