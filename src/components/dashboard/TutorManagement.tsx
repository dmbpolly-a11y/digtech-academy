import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { db } from '../../lib/supabase';

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-amber-100 text-amber-800 border-amber-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  const colorClass = colors[color] || colors.gray;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${colorClass}`}>
      {children}
    </span>
  );
}

export function TutorManagement() {
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTutors = async () => {
    setLoading(true);
    const { data } = await db.users.getByRole('tutor');
    if (data) setTutors(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTutors();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'suspend'} this tutor?`)) return;
    
    await db.users.update(id, { status: newStatus });
    loadTutors();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this tutor account? This action cannot be undone.')) return;
    await db.users.delete(id);
    loadTutors();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Faculty & Tutor Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">Review, approve, suspend, or manage tutor accounts.</p>
        </div>
        <button onClick={loadTutors} className="p-2 text-gray-500 hover:text-[#1A4095] transition-colors rounded-xl hover:bg-blue-50">
          <Icon icon="lucide:refresh-cw" className={`w-5 h-5 ${loading ? 'animate-spin text-[#1A4095]' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Tutor Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tutors.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No tutors found in the database.
                  </td>
                </tr>
              )}
              {tutors.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{t.full_name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Joined: {new Date(t.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600">{t.email}</div>
                    {t.phone && <div className="text-[11px] text-gray-400 mt-0.5">{t.phone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={t.status === 'active' ? 'green' : t.status === 'suspended' ? 'red' : 'gray'}>
                      {t.status || 'Unknown'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleToggleStatus(t.id, t.status)}
                      className={`p-2 rounded-lg transition-colors ${
                        t.status === 'active' 
                          ? 'text-amber-600 hover:bg-amber-50 bg-amber-50/50' 
                          : 'text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50'
                      }`}
                      title={t.status === 'active' ? 'Suspend Tutor' : 'Activate Tutor'}
                    >
                      <Icon icon={t.status === 'active' ? "lucide:pause-circle" : "lucide:play-circle"} className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2 text-red-600 hover:bg-red-50 bg-red-50/50 rounded-lg transition-colors"
                      title="Delete Tutor"
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
