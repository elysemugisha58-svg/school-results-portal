import React from 'react';

export default function SuperAdminDashboard() {
  // These are just fake visual data for now so we can see the layout
  const stats = [
    { title: 'Total Schools', value: '14', color: '#8b5cf6' },
    { title: 'Total Students', value: '3,249', color: '#3b82f6' },
    { title: 'Total Teachers', value: '182', color: '#10b981' },
    { title: 'System Admins', value: '4', color: '#f59e0b' },
  ];

  const recentSchools = [
    { id: 1, name: 'Green Hills Academy', location: 'Kigali', status: 'Active' },
    { id: 2, name: 'Riverside High', location: 'Nairobi', status: 'Active' },
    { id: 3, name: 'Sunrise Primary', location: 'Kampala', status: 'Pending' },
    { id: 4, name: 'Unity College', location: 'Dar es Salaam', status: 'Active' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f0f1a', color: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '260px', backgroundColor: '#161625', padding: '24px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #2a2a3c' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '40px' }}>
          EdTech Portal
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '12px 16px', backgroundColor: '#2a2a3c', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📊 Overview</div>
          <div style={{ padding: '12px 16px', color: '#a1a1aa', cursor: 'pointer' }}>🏫 Manage Schools</div>
          <div style={{ padding: '12px 16px', color: '#a1a1aa', cursor: 'pointer' }}>👥 Global Users</div>
          <div style={{ padding: '12px 16px', color: '#a1a1aa', cursor: 'pointer' }}>⚙️ System Settings</div>
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #2a2a3c', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>E</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Elyse M.</div>
              <div style={{ fontSize: '12px', color: '#a1a1aa' }}>Super Admin</div>
            </div>
          </div>
          <button style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}>
            Log Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ margin: 0, fontSize: '28px' }}>Dashboard Overview</h1>
          <p style={{ color: '#a1a1aa', marginTop: '8px' }}>Welcome back, Elyse. Here is what is happening across the system today.</p>
        </header>

        {/* STATS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {stats.map((stat, index) => (
            <div key={index} style={{ backgroundColor: '#161625', padding: '24px', borderRadius: '12px', border: '1px solid #2a2a3c' }}>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#a1a1aa', fontWeight: 'normal' }}>{stat.title}</h3>
              <p style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* TABLES SECTION */}
        <div style={{ backgroundColor: '#161625', borderRadius: '12px', border: '1px solid #2a2a3c', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Recently Added Schools</h2>
            <button style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              + Add School
            </button>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a3c', color: '#a1a1aa', fontSize: '14px' }}>
                <th style={{ paddingBottom: '12px', fontWeight: 'normal' }}>School Name</th>
                <th style={{ paddingBottom: '12px', fontWeight: 'normal' }}>Location</th>
                <th style={{ paddingBottom: '12px', fontWeight: 'normal' }}>Status</th>
                <th style={{ paddingBottom: '12px', fontWeight: 'normal' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentSchools.map((school) => (
                <tr key={school.id} style={{ borderBottom: '1px solid #2a2a3c', fontSize: '15px' }}>
                  <td style={{ padding: '16px 0', fontWeight: 'bold' }}>{school.name}</td>
                  <td style={{ padding: '16px 0', color: '#a1a1aa' }}>{school.location}</td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: school.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: school.status === 'Active' ? '#10b981' : '#f59e0b'
                    }}>
                      {school.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 0' }}>
                    <button style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontWeight: 'bold' }}>Edit</button>
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
