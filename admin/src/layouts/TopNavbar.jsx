import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, Moon, Sun, User, Receipt, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { inboxApi, searchApi } from '../services/adminService';

const severityClass = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-slate-500 dark:text-slate-400',
};

const TopNavbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxItems, setInboxItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxLoading, setInboxLoading] = useState(false);
  const searchRef = useRef(null);
  const inboxRef = useRef(null);
  const searchTimerRef = useRef(null);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await inboxApi.unreadCount();
      setUnreadCount(res.data.data?.count || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
      if (inboxRef.current && !inboxRef.current.contains(event.target)) {
        setInboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return undefined;
    }

    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await searchApi.query(q);
        setSearchResults(res.data.data);
        setSearchOpen(true);
      } catch {
        setSearchResults({ users: [], transactions: [] });
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/transactions?search=${encodeURIComponent(q)}`);
    setSearchOpen(false);
  };

  const openInbox = async () => {
    const nextOpen = !inboxOpen;
    setInboxOpen(nextOpen);
    if (!nextOpen) return;

    setInboxLoading(true);
    try {
      const res = await inboxApi.list({ limit: 15, unread: 'false' });
      setInboxItems(res.data.data || []);
      await inboxApi.markRead();
      setUnreadCount(0);
    } catch {
      setInboxItems([]);
    } finally {
      setInboxLoading(false);
    }
  };

  const hasResults = searchResults
    && (searchResults.users?.length > 0 || searchResults.transactions?.length > 0);

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

        <div ref={searchRef} className="relative hidden sm:block">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            {searchLoading ? (
              <Loader2 size={16} className="animate-spin text-slate-400" />
            ) : (
              <Search size={16} className="text-slate-400" />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
              placeholder="Search users, transactions, references..."
              className="w-56 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500 lg:w-72"
            />
          </form>

          {searchOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {!hasResults && !searchLoading && (
                <p className="px-4 py-3 text-sm text-slate-500">No matches found.</p>
              )}

              {searchResults?.users?.length > 0 && (
                <div className="border-b border-slate-100 dark:border-slate-800">
                  <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Users</p>
                  {searchResults.users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        navigate(`/users/${user.id}`);
                        setSearchOpen(false);
                      }}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <User size={16} className="mt-0.5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.fullName}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchResults?.transactions?.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Transactions</p>
                  {searchResults.transactions.map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => {
                        navigate(`/transactions/${tx.id}`);
                        setSearchOpen(false);
                      }}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Receipt size={16} className="mt-0.5 text-secondary" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{tx.reference}</p>
                        <p className="text-xs text-slate-500">
                          {tx.service} · ₦{Number(tx.amount).toLocaleString()} · {tx.status}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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

        <div ref={inboxRef} className="relative">
          <button
            type="button"
            onClick={openInbox}
            className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Admin notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {inboxOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Security alerts</p>
                <p className="text-xs text-slate-500">Recent admin events</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {inboxLoading && (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">Loading...</p>
                )}
                {!inboxLoading && inboxItems.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications</p>
                )}
                {!inboxLoading && inboxItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate('/security-events');
                      setInboxOpen(false);
                    }}
                    className="block w-full border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/80"
                  >
                    <p className={`text-xs font-semibold uppercase ${severityClass[item.severity] || severityClass.medium}`}>
                      {item.eventType?.replace(/_/g, ' ')}
                    </p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{item.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.user || item.userEmail || 'System'} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigate('/security-events');
                  setInboxOpen(false);
                }}
                className="w-full border-t border-slate-100 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                View all events
              </button>
            </div>
          )}
        </div>

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
