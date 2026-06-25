import { useState, useEffect } from 'react';
import { Save, Lock } from 'lucide-react';
import { PageHeader, PageLoader, ErrorAlert } from '../components';
import { settingsApi, getErrorMessage } from '../services/adminService';
import { useDialog } from '../hooks/useDialog';

const SettingsPage = () => {
  const dialog = useDialog();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [saved, setSaved] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    settingsApi.get()
      .then((res) => setSettings(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSaveSettings = async () => {
    setSubmitting(true);
    try {
      await settingsApi.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      dialog.notifySuccess('Settings saved');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      setPassMsg('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await settingsApi.changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.newPass,
      });
      setPassMsg('Password changed successfully!');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      setPassMsg(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;
  if (!settings) return null;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure system and account settings" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
            <Lock size={18} className="text-primary" /> Change Password
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Current Password</label>
              <input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">New Password</label>
              <input type="password" value={passwords.newPass} onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm Password</label>
              <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>
            {passMsg && <p className={`text-sm font-medium ${passMsg.includes('success') ? 'text-emerald-600' : 'text-red-500'}`}>{passMsg}</p>}
            <button type="submit" disabled={submitting} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">
              Update Password
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
            <Save size={18} className="text-secondary" /> System Settings
          </h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Maintenance Mode</p>
                <p className="text-xs text-slate-400">Disable app access for users</p>
              </div>
              <button type="button" onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)} className={`relative h-7 w-12 rounded-full transition ${settings.maintenanceMode ? 'bg-red-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${settings.maintenanceMode ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">OTP Required</p>
                <p className="text-xs text-slate-400">Require OTP on registration</p>
              </div>
              <button type="button" onClick={() => updateSetting('otpRequired', !settings.otpRequired)} className={`relative h-7 w-12 rounded-full transition ${settings.otpRequired ? 'bg-primary' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${settings.otpRequired ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Min Wallet Fund (₦)</label>
              <input type="number" value={settings.minWalletFund} onChange={(e) => updateSetting('minWalletFund', +e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Max Wallet Fund (₦)</label>
              <input type="number" value={settings.maxWalletFund} onChange={(e) => updateSetting('maxWalletFund', +e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Referral Bonus (₦)</label>
              <input type="number" value={settings.referralBonus} onChange={(e) => updateSetting('referralBonus', +e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Support Email</label>
              <input type="email" value={settings.supportEmail} onChange={(e) => updateSetting('supportEmail', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary" />
            </div>

            <button type="button" disabled={submitting} onClick={handleSaveSettings} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">
              <Save size={16} /> {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
