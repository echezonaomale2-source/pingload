import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, ArrowLeftRight, Wallet, Settings2,
  Bell, Gift, Headphones, Settings, LogOut, X, ShieldCheck, HelpCircle, Tag, Database, RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../hooks/useDialog';
import PingloadLogo from '../components/modals/PingloadLogo';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/refunds', icon: RotateCcw, label: 'Refunds' },
  { to: '/wallets', icon: Wallet, label: 'Wallets' },
  { to: '/services', icon: Settings2, label: 'Services' },
  { to: '/service-prices', icon: Tag, label: 'Pricing' },
  { to: '/data-plans', icon: Database, label: 'Data Plans' },
  { to: '/kyc', icon: ShieldCheck, label: 'KYC' },
  { to: '/faq', icon: HelpCircle, label: 'FAQ' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/referrals', icon: Gift, label: 'Referrals' },
  { to: '/support', icon: Headphones, label: 'Support' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = ({ open, onClose }) => {
  const { logout } = useAuth();
  const dialog = useDialog();

  const handleLogout = async () => {
    const ok = await dialog.confirm({
      title: 'Logout',
      message: 'Are you sure you want to logout from the admin dashboard?',
      confirmText: 'Logout',
      destructive: true,
    });
    if (ok) logout();
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
      isActive
        ? 'bg-primary text-white shadow-md shadow-primary/25'
        : 'text-slate-400 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0B1F3A] transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-2.5">
            <PingloadLogo size={36} />
            <div>
              <p className="text-sm font-extrabold text-white">Pingload</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-secondary">Admin</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} onClick={onClose}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
