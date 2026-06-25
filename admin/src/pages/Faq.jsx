import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Modal, PageLoader, ErrorAlert } from '../components';
import { faqApi, getErrorMessage } from '../services/adminService';
import { useDialog } from '../hooks/useDialog';

const FaqPage = () => {
  const dialog = useDialog();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', order: 0, isActive: true });

  const fetchFaqs = () => {
    faqApi.list()
      .then((res) => setFaqs(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFaqs(); }, []);

  const openCreate = () => {
    setForm({ question: '', answer: '', order: faqs.length, isActive: true });
    setModal('create');
  };

  const openEdit = (faq) => {
    setForm({ question: faq.question, answer: faq.answer, order: faq.order, isActive: faq.isActive });
    setModal(faq._id);
  };

  const handleSave = async () => {
    try {
      if (modal === 'create') {
        await faqApi.create(form);
      } else {
        await faqApi.update(modal, form);
      }
      setModal(null);
      fetchFaqs();
      dialog.notifySuccess(modal === 'create' ? 'FAQ created' : 'FAQ saved');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    const ok = await dialog.confirm({
      title: 'Delete FAQ',
      message: 'Delete this FAQ?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await faqApi.delete(id);
      fetchFaqs();
      dialog.notifySuccess('FAQ deleted');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader
        title="FAQ Management"
        subtitle="Manage frequently asked questions"
        action={
          <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
            <Plus size={18} /> Add FAQ
          </button>
        }
      />

      <div className="space-y-3">
        {faqs.map((faq) => (
          <div key={faq._id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-bold text-slate-800">{faq.question}</p>
                <p className="mt-2 text-sm text-slate-600">{faq.answer}</p>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${faq.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {faq.isActive ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => openEdit(faq)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary"><Pencil size={16} /></button>
                <button type="button" onClick={() => handleDelete(faq._id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add FAQ' : 'Edit FAQ'}>
        <div className="space-y-3">
          <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Question" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Answer" rows={4} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active (visible to users)
          </label>
          <button type="button" onClick={handleSave} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white">Save</button>
        </div>
      </Modal>
    </div>
  );
};

export default FaqPage;
