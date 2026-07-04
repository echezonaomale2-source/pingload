import { useEffect, useState } from 'react';
import {
  DollarSign, TrendingUp, Calendar, Wallet, PieChart as PieIcon,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader, StatCard, PageLoader, ErrorAlert } from '../components';
import { revenueApi, getErrorMessage } from '../services/adminService';
import { formatCurrency } from '../utils/formatters';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const SERVICE_LABELS = {
  airtime: 'Airtime',
  data: 'Data',
  electricity: 'Electricity',
  tv: 'TV',
  education: 'Education',
  betting: 'Betting',
};

const RevenuePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    revenueApi.getDashboard()
      .then((res) => setData(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;
  if (!data) return null;

  const { totals, serviceBreakdown, monthlyTrend } = data;
  const pieData = (serviceBreakdown || []).map((row) => ({
    name: SERVICE_LABELS[row.service] || row.service || 'Other',
    value: row.revenue,
    count: row.count,
  }));

  return (
    <div>
      <PageHeader
        title="Revenue Dashboard"
        subtitle="Revenue, commission, and service breakdown"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Revenue" value={formatCurrency(totals.totalRevenue)} icon={DollarSign} color="success" />
        <StatCard title="Total Commission" value={formatCurrency(totals.totalCommission)} icon={Wallet} color="purple" />
        <StatCard title="Revenue Today" value={formatCurrency(totals.revenueToday)} icon={Calendar} color="primary" />
        <StatCard title="Revenue This Week" value={formatCurrency(totals.revenueWeek)} icon={TrendingUp} color="secondary" />
        <StatCard title="Revenue This Month" value={formatCurrency(totals.revenueMonth)} icon={PieIcon} color="warning" />
        <StatCard title="Revenue This Year" value={formatCurrency(totals.revenueYear)} icon={DollarSign} color="success" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" fill="#2563EB33" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Revenue by Service (This Month)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-700">Service Breakdown (This Month)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={pieData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenuePage;
