const AdminDashboardService = {
  async init() {
    this.bindEvents();
    
    // Load standard stuff
    const user = auth.getUser();
    if (user) {
      const nameEl = document.getElementById('currentUserName');
      if (nameEl) nameEl.textContent = user.name || 'Administrator';
    }

    await this.fetchStats();
    await this.fetchUsers('');
    await this.fetchAccidents('');
  },

  bindEvents() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => auth.logout());

    // Tabs logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Reset all
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('active', 'text-purple-400', 'border-purple-500');
          b.classList.add('text-slate-400', 'border-transparent');
        });
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

        // Set active
        const target = e.target;
        target.classList.add('active', 'text-purple-400', 'border-purple-500');
        target.classList.remove('text-slate-400', 'border-transparent');
        
        const tabId = target.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
      });
    });

    // Users filters logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => {
          b.classList.remove('active', 'bg-purple-600/30', 'text-purple-300', 'border-purple-500/50');
          b.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
        });
        const target = e.target;
        target.classList.add('active', 'bg-purple-600/30', 'text-purple-300', 'border-purple-500/50');
        target.classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700');
        
        this.fetchUsers(target.getAttribute('data-role'));
      });
    });

    // Accidents filters logic
    const accFilterBtns = document.querySelectorAll('.acc-filter-btn');
    accFilterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        accFilterBtns.forEach(b => {
          b.classList.remove('active', 'bg-amber-600/30', 'text-amber-300', 'border-amber-500/50');
          b.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
        });
        const target = e.target;
        target.classList.add('active', 'bg-amber-600/30', 'text-amber-300', 'border-amber-500/50');
        target.classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700');
        
        this.fetchAccidents(target.getAttribute('data-type'));
      });
    });
  },

  async fetchStats() {
    try {
      const res = await api.fetch('/admin/stats');
      if (res.ok && res.data.success) {
        const stats = res.data.data;
        document.getElementById('statUsers').textContent = stats.users;
        document.getElementById('statPolice').textContent = stats.policeStations;
        document.getElementById('statAmbulances').textContent = stats.ambulances;
        document.getElementById('statAccidents').textContent = stats.accidents;
        document.getElementById('statActive').textContent = stats.activeEmergencies;
        document.getElementById('statCompleted').textContent = stats.completedEmergencies;
      }
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  },

  async fetchUsers(role) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">Loading users...</td></tr>';
    
    try {
      const url = role ? `/admin/users?role=${role}` : '/admin/users';
      const res = await api.fetch(url);
      
      if (res.ok && res.data.success) {
        this.renderUsers(res.data.data);
      } else {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-rose-500 font-bold">Failed to load users</td></tr>';
      }
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-rose-500 font-bold">Network error</td></tr>';
    }
  },

  renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      let roleColor = 'text-slate-400';
      if (u.role === 'ADMIN') roleColor = 'text-purple-400';
      if (u.role === 'POLICE') roleColor = 'text-blue-400';
      if (u.role === 'AMBULANCE') roleColor = 'text-emerald-400';
      
      let nameDesc = u.name;
      if (u.role === 'POLICE') nameDesc = `${u.stationName || 'N/A'} (Admin: ${u.name})`;
      if (u.role === 'AMBULANCE') nameDesc = `${u.ambulanceName || 'N/A'} (Driver: ${u.driverName || 'N/A'}, Veh: ${u.vehicleNumber || 'N/A'})`;

      let approvalClass = 'text-slate-400';
      if (u.approvalStatus === 'APPROVED') approvalClass = 'text-emerald-400';
      if (u.approvalStatus === 'REJECTED') approvalClass = 'text-rose-400';
      if (u.approvalStatus === 'PENDING') approvalClass = 'text-amber-400 animate-pulse';

      return `
        <tr class="hover:bg-slate-800/50 transition-colors">
          <td class="p-3 font-mono text-xs ${roleColor} font-bold">${u.role}</td>
          <td class="p-3 font-medium text-slate-200">${nameDesc}</td>
          <td class="p-3 text-slate-400">${u.email}</td>
          <td class="p-3 font-mono text-xs font-bold ${approvalClass}">${u.approvalStatus || 'N/A'}</td>
          <td class="p-3 text-right">
            ${['POLICE', 'AMBULANCE'].includes(u.role) ? `
              <select onchange="AdminDashboardService.updateApproval('${u._id}', this.value)" class="bg-black/50 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 outline-none">
                <option value="" disabled selected>Change Status...</option>
                <option value="APPROVED">Approve</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Reject</option>
              </select>
            ` : '<span class="text-slate-600 text-xs italic">N/A</span>'}
          </td>
        </tr>
      `;
    }).join('');
  },

  async updateApproval(id, status) {
    if (!confirm(`Are you sure you want to change approval status to ${status}?`)) return;
    
    try {
      const res = await api.fetch(`/admin/users/${id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      
      if (res.ok && res.data.success) {
        // Re-fetch users based on current filter
        const activeFilter = document.querySelector('.filter-btn.active');
        this.fetchUsers(activeFilter ? activeFilter.getAttribute('data-role') : '');
        this.fetchStats(); // Update stats if relevant
      } else {
        alert(res.data.message || 'Failed to update status');
      }
    } catch (err) {
      alert('Network error');
    }
  },

  async fetchAccidents(type) {
    const tbody = document.getElementById('accidentsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">Loading accidents...</td></tr>';
    
    try {
      const url = type ? `/admin/accidents?type=${type}` : '/admin/accidents';
      const res = await api.fetch(url);
      
      if (res.ok && res.data.success) {
        this.renderAccidents(res.data.data);
      } else {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-rose-500 font-bold">Failed to load accidents</td></tr>';
      }
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-rose-500 font-bold">Network error</td></tr>';
    }
  },

  renderAccidents(accidents) {
    const tbody = document.getElementById('accidentsTableBody');
    
    if (!accidents || accidents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">No accidents found.</td></tr>';
      return;
    }

    tbody.innerHTML = accidents.map(acc => {
      const date = new Date(acc.createdAt).toLocaleString('en-US', { 
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
      });
      
      let pStatusColor = 'text-amber-400';
      if (acc.status === 'VERIFIED') pStatusColor = 'text-emerald-400';
      if (acc.status === 'REJECTED') pStatusColor = 'text-rose-400';
      
      let aStatusColor = 'text-slate-400';
      if (acc.ambulanceAlertStatus === 'SENT') aStatusColor = 'text-rose-400 animate-pulse';
      if (acc.ambulanceAlertStatus === 'ACCEPTED') aStatusColor = 'text-cyan-400 animate-pulse';
      if (acc.ambulanceAlertStatus === 'COMPLETED') aStatusColor = 'text-emerald-400';

      const reporter = acc.reportedBy ? acc.reportedBy.name : 'Unknown';
      const police = acc.assignedPoliceStation ? acc.assignedPoliceStation.stationName : 'None';
      const ambulance = acc.assignedAmbulance ? acc.assignedAmbulance.ambulanceName : 'None';

      return `
        <tr class="hover:bg-slate-800/50 transition-colors">
          <td class="p-3 font-mono text-xs text-slate-300">
            ${date}
            <div class="text-[10px] text-slate-500 mt-1">ID: ${acc._id}</div>
          </td>
          <td class="p-3">
            <div class="font-bold text-white">${acc.accidentType}</div>
            <div class="text-xs font-mono text-rose-300 mt-1 uppercase">${acc.severity}</div>
          </td>
          <td class="p-3">
            <div class="font-mono text-xs text-cyan-400">${acc.latitude.toFixed(4)}, ${acc.longitude.toFixed(4)}</div>
            <div class="text-xs text-slate-400 mt-1 truncate max-w-[200px]">${acc.description}</div>
          </td>
          <td class="p-3">
            <div class="font-mono text-xs font-bold ${pStatusColor}">${acc.status}</div>
            <div class="text-[10px] text-slate-400 mt-1">Assigned: ${police}</div>
          </td>
          <td class="p-3">
            <div class="font-mono text-xs font-bold ${aStatusColor}">${acc.ambulanceAlertStatus || 'NOT_SENT'}</div>
            <div class="text-[10px] text-slate-400 mt-1">Assigned: ${ambulance}</div>
          </td>
        </tr>
      `;
    }).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!auth.protectRoute(['ADMIN'])) return;
  AdminDashboardService.init();
});
