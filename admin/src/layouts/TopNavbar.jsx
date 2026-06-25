import { Menu, Bell, Search, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const TopNavbar = ({ onMenuClick }) => {
  const { admin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/90 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu size={22} />
        </button>
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 sm:flex">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-48 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button type="button" className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-secondary" />
        </button>
        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-700">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{admin?.name}</p>
            <p className="text-xs text-slate-400">{admin?.email}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
            {admin?.name?.charAt(0) || 'A'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
