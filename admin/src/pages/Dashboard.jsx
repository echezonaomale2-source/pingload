import { useEffect, useState } from 'react';
import {
  Users, ArrowLeftRight, DollarSign, Wallet,
  CheckCircle, Clock, XCircle, UserCheck, UserX, Calendar, RotateCcw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { StatCard, PageLoader, ErrorAlert } from '../components';
import { dashboardApi, getErrorMessage } from '../services/adminService';
import { formatCurrency } from '../utils/formatters';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.getStats()
      .then((res) => setData(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;
  if (!data) return null;

  const { stats, revenueChartData, serviceBreakdown, recentTransactions } = data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back! Here&apos;s what&apos;s happening on Pingload today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} color="primary" />
        <StatCard title="Active Users" value={stats.activeUsers.toLocaleString()} icon={UserCheck} color="success" />
        <StatCard title="Suspended Users" value={stats.suspendedUsers.toLocaleString()} icon={UserX} color="danger" />
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} color="success" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Transactions" value={stats.totalTransactions.toLocaleString()} icon={ArrowLeftRight} color="secondary" />
        <StatCard title="Today's Transactions" value={stats.todayTransactions.toLocaleString()} icon={Calendar} color="purple" />
        <StatCard title="Wallet Balance" value={formatCurrency(stats.walletBalance)} icon={Wallet} color="purple" />
        <StatCard title="Pending" value={stats.pendingTransactions.toLocaleString()} icon={Clock} color="warning" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard title="Successful" value={stats.successfulTransactions.toLocaleString()} icon={CheckCircle} color="success" />
        <StatCard title="Failed" value={stats.failedTransactions.toLocaleString()} icon={XCircle} color="danger" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Refunds" value={(stats.totalRefunds || 0).toLocaleString()} icon={RotateCcw} color="warning" />
        <StatCard title="Refund Amount Today" value={formatCurrency(stats.refundAmountToday || 0)} icon={Calendar} color="purple" />
        <StatCard title="Total Refunded Amount" value={formatCurrency(stats.totalRefundedAmount || 0)} icon={DollarSign} color="danger" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-base font-bold text-slate-800">Revenue Analytics</h3>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0057D9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0057D9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₦${(v / 1e6).toFixed(1)}M`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#0057D9" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">No revenue data yet</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-800">Service Breakdown</h3>
          {serviceBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={serviceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {serviceBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">No service data yet</p>
          )}
        </div>
      </div>

      {revenueChartData.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-800">Transaction Volume</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="transactions" fill="#FF7A00" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold text-slate-800">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No transactions yet</td></tr>
              ) : recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{String(tx.id).slice(-8)}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{tx.userName}</td>
                  <td className="px-5 py-3 capitalize text-slate-600">{tx.service?.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3 font-semibold text-slate-800">{formatCurrency(tx.amount)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                      tx.status === 'successful' ? 'bg-emerald-100 text-emerald-700' :
                      tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>{tx.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
