import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/adminService';
import { useDialog } from '../hooks/useDialog';
import { ButtonLoader } from '../components/loading';
import { useGlobalLoading } from '../context/LoadingProvider';
import PingloadLogo from '../components/modals/PingloadLogo';

const Login = () => {
  const { login } = useAuth();
  const dialog = useDialog();
  const globalLoading = useGlobalLoading();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@pingload.top');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const isBusy = loading || globalLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      dialog.alertError('Login Failed', getErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-[#0B1F3A] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <PingloadLogo size={48} />
          <div>
            <p className="text-lg font-extrabold">Pingload Admin</p>
            <p className="text-xs font-semibold text-secondary">Fintech Control Panel</p>
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">
            Manage your<br />
            <span className="text-secondary">fintech platform</span>
          </h2>
          <p className="mt-4 max-w-md text-slate-400">
            Monitor transactions, manage users, control services, and oversee your entire Pingload ecosystem from one dashboard.
          </p>
        </div>
        <p className="text-xs text-slate-500">&copy; 2026 Pingload. All rights reserved.</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <PingloadLogo size={44} />
              <p className="text-xl font-extrabold text-slate-900">Pingload Admin</p>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your admin account</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="admin@pingload.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark disabled:opacity-60"
            >
              {loading && !globalLoading ? <ButtonLoader /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
