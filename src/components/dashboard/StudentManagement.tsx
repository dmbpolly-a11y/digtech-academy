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

export function StudentManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStudents = async () => {
    setLoading(true);
    const { data } = await db.users.getByRole('student');
    if (data) setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'suspend'} this student?`)) return;
    
    await db.users.update(id, { status: newStatus });
    loadStudents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this student account? This action cannot be undone.')) return;
    await db.users.delete(id);
    loadStudents();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Student Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">Manage all registered student accounts on the platform.</p>
        </div>
        <button onClick={loadStudents} className="p-2 text-gray-500 hover:text-[#1A4095] transition-colors rounded-xl hover:bg-blue-50">
          <Icon icon="lucide:refresh-cw" className={`w-5 h-5 ${loading ? 'animate-spin text-[#1A4095]' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No students found in the database.
                  </td>
                </tr>
              )}
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{s.full_name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Joined: {new Date(s.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600">{s.email}</div>
                    {s.phone && <div className="text-[11px] text-gray-400 mt-0.5">{s.phone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={s.status === 'active' ? 'green' : s.status === 'suspended' ? 'red' : 'gray'}>
                      {s.status || 'Unknown'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleToggleStatus(s.id, s.status)}
                      className={`p-2 rounded-lg transition-colors ${
                        s.status === 'active' 
                          ? 'text-amber-600 hover:bg-amber-50 bg-amber-50/50' 
                          : 'text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50'
                      }`}
                      title={s.status === 'active' ? 'Suspend Student' : 'Activate Student'}
                    >
                      <Icon icon={s.status === 'active' ? "lucide:pause-circle" : "lucide:play-circle"} className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-2 text-red-600 hover:bg-red-50 bg-red-50/50 rounded-lg transition-colors"
                      title="Delete Student"
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
