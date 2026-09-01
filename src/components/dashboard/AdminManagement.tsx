import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { db, auth } from '../../lib/supabase';

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

export function AdminManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const loadAdmins = async () => {
    setLoading(true);
    const { data } = await db.users.getByRole('admin');
    if (data) setAdmins(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName || !adminEmail || !adminPassword) return;

    // Create the user in Auth
    const { data: authData, error: authError } = await auth.signUp(adminEmail, adminPassword, {
      full_name: adminName,
      phone: adminPhone,
      role: 'admin'
    });

    if (authError) {
      alert(`Error creating admin auth: ${authError.message}`);
      return;
    }

    if (authData?.user) {
      const newAdmin = {
        id: authData.user.id,
        email: adminEmail,
        full_name: adminName,
        phone: adminPhone || '',
        role: 'admin',
        status: 'active'
      };
      
      const { error: dbError } = await db.users.create(newAdmin);
      if (dbError) {
         console.error('Error adding admin to DB:', dbError);
      } else {
         loadAdmins();
      }
    }

    setAdminName('');
    setAdminEmail('');
    setAdminPhone('');
    setAdminPassword('');
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'suspend'} this admin?`)) return;
    
    await db.users.update(id, { status: newStatus });
    loadAdmins();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this admin account? This action cannot be undone.')) return;
    await db.users.delete(id);
    loadAdmins();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Admin Provisioning Portal
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Create, configure, and deactivate Admin accounts.
        </p>
      </div>

      {/* Create Admin Form */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Provision New Administrator</h3>
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Full Name"
              className="border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-[#1A4095]"
            />
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Email Address"
              className="border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-[#1A4095]"
            />
            <input
              type="tel"
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              placeholder="Phone Number"
              className="border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-[#1A4095]"
            />
             <input
              type="password"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Temporary Password"
              className="border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-[#1A4095]"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#1A4095] text-white font-bold text-xs hover:opacity-90"
          >
            Create Admin Account
          </button>
        </form>
      </div>

      {/* List of Admins */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-gray-900">Configured Administrators</h3>
          <button onClick={loadAdmins} className="p-1 text-gray-500 hover:text-[#1A4095] transition-colors rounded-lg hover:bg-blue-50">
            <Icon icon="lucide:refresh-cw" className={`w-4 h-4 ${loading ? 'animate-spin text-[#1A4095]' : ''}`} />
          </button>
        </div>
        
        {admins.length === 0 && !loading ? (
           <p className="text-xs text-gray-500">No admins found.</p>
        ) : (
          <div className="space-y-3">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50/50 transition-colors">
                <div>
                  <div className="text-xs font-bold text-gray-900">{a.full_name}</div>
                  <div className="text-[11px] text-gray-500">{a.email} • {a.phone}</div>
                  <div className="mt-1">
                    <Badge color={a.status === 'active' ? 'green' : 'red'}>{a.status || 'active'}</Badge>
                    <span className="ml-2">
                       <Badge color="blue">admin</Badge>
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-[11px] text-gray-400 self-center mr-2">Created: {new Date(a.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleToggleStatus(a.id, a.status)}
                    className={`p-2 rounded-lg transition-colors ${
                      a.status === 'active' 
                        ? 'text-amber-600 hover:bg-amber-50 bg-amber-50/50' 
                        : 'text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50'
                    }`}
                    title={a.status === 'active' ? 'Suspend Admin' : 'Activate Admin'}
                  >
                    <Icon icon={a.status === 'active' ? "lucide:pause-circle" : "lucide:play-circle"} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-2 text-red-600 hover:bg-red-50 bg-red-50/50 rounded-lg transition-colors"
                    title="Delete Admin"
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
