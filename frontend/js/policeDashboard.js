const PoliceDashboardService = {
  init() {
    this.reportsList = document.getElementById('pendingReportsList');
    this.refreshBtn = document.getElementById('refreshReportsBtn');

    if (!this.reportsList) return;

    this.bindEvents();
    this.fetchPendingReports();
  },

  bindEvents() {
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.fetchPendingReports());
    }

    // Use event delegation for dynamic buttons
    this.reportsList.addEventListener('click', (e) => {
      const verifyBtn = e.target.closest('.verify-btn');
      const rejectBtn = e.target.closest('.reject-btn');

      if (verifyBtn) {
        this.updateStatus(verifyBtn.dataset.id, 'VERIFIED');
      } else if (rejectBtn) {
        this.updateStatus(rejectBtn.dataset.id, 'REJECTED');
      }
    });
  },

  async fetchPendingReports() {
    try {
      this.reportsList.innerHTML = '<div class="text-center p-8 text-sm text-slate-400 animate-pulse">Loading pending reports...</div>';
      
      const response = await api.fetch('/accidents/pending');
      
      if (response.ok && response.data.success) {
        this.renderReports(response.data.data);
      } else {
        this.showError('Failed to load pending reports.');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      this.showError('Network error while loading reports.');
    }
  },

  async updateStatus(id, newStatus) {
    if (!confirm(`Are you sure you want to mark this report as ${newStatus}?`)) {
      return;
    }

    try {
      const response = await api.fetch(`/accidents/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok && response.data.success) {
        // Optimistically remove the card from the UI
        const card = document.getElementById(`report-${id}`);
        if (card) {
          card.remove();
        }
        
        // If empty after removal
        if (this.reportsList.children.length === 0) {
          this.renderReports([]);
        }
      } else {
        alert(response.data.message || 'Failed to update status.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Network error while updating status.');
    }
  },

  renderReports(reports) {
    if (!reports || reports.length === 0) {
      this.reportsList.innerHTML = `
        <div class="text-center p-12 bg-slate-900/50 rounded-lg border border-slate-800">
          <p class="text-sm text-slate-400">No pending reports to review at this time.</p>
        </div>
      `;
      return;
    }

    this.reportsList.innerHTML = reports.map(report => this.createReportHTML(report)).join('');
  },

  createReportHTML(report) {
    const date = new Date(report.createdAt).toLocaleString();
    
    // AI Analysis section
    let aiSection = '';
    if (report.aiAnalysis && report.aiAnalysis.provider) {
      const isDetected = report.aiAnalysis.detected;
      const detectedText = isDetected ? 'Accident Detected' : 'No Accident Detected';
      const aiSeverity = report.aiAnalysis.severity || 'Unknown';
      const confidence = Math.round((report.aiAnalysis.confidence || 0) * 100);
      const observations = report.aiAnalysis.observations || 'None';

      const detectedColor = isDetected ? 'text-rose-400' : 'text-slate-400';

      aiSection = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div class="flex flex-col">
            <span class="text-[10px] text-slate-500 font-mono tracking-wider">AI DETECTION:</span>
            <span class="text-sm font-bold ${detectedColor}">${detectedText}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] text-slate-500 font-mono tracking-wider">AI SEVERITY:</span>
            <span class="text-sm font-bold text-white">${aiSeverity}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] text-slate-500 font-mono tracking-wider">AI CONFIDENCE:</span>
            <span class="text-sm font-bold text-cyan-300">${confidence}%</span>
          </div>
        </div>
        <div class="mt-2 text-xs text-slate-300 bg-black/40 p-3 rounded-lg border border-slate-800">
          <span class="text-cyan-500/70 block mb-1 text-[10px] font-mono">OBSERVATIONS:</span>
          ${observations}
        </div>
      `;
    } else {
      aiSection = `
        <div class="mt-2 text-sm text-slate-500 italic">
          AI analysis pending or unavailable.
        </div>
      `;
    }

    return `
      <div id="report-${report._id}" class="bg-slate-900/80 rounded-xl p-5 border border-slate-700/60 shadow-lg flex flex-col md:flex-row gap-5 relative overflow-hidden group">
        
        <!-- Image Section -->
        <div class="w-full md:w-64 h-48 rounded-lg overflow-hidden border border-slate-800 bg-black flex-shrink-0 flex items-center justify-center relative">
          <img src="${report.imagePath}" onerror="this.outerHTML='<div class=\\'text-slate-500 text-sm italic\\'>Image unavailable</div>'" alt="Accident Evidence" class="w-full h-full object-cover">
          <div class="absolute top-2 right-2 text-[10px] font-black tracking-widest px-2 py-1 rounded border bg-amber-500/20 text-amber-400 border-amber-500/30">
            ${report.status}
          </div>
        </div>
        
        <!-- Details Section -->
        <div class="flex flex-col flex-1">
          <div class="flex flex-col xl:flex-row justify-between items-start gap-4">
              <div>
                <h3 class="text-lg font-bold text-white">${report.accidentType}</h3>
                <p class="text-xs text-slate-400 font-mono">${date}</p>
              </div>
              
              <div class="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}&travelmode=driving', '_blank')" class="btn-cyber-primary !bg-cyan-600 hover:!bg-cyan-500 !border-cyan-400 px-4 py-2 rounded-lg font-bold text-xs tracking-wide shadow-lg shadow-cyan-900/50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                  <i class="ph-bold ph-navigation-arrow"></i> NAVIGATE TO ACCIDENT
                </button>
                <div class="flex gap-2 w-full sm:w-auto">
                  <button class="verify-btn flex-1 sm:flex-none btn-cyber-primary !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-400 px-4 py-2 rounded-lg font-bold text-xs tracking-wide shadow-lg shadow-emerald-900/50 transition-colors" data-id="${report._id}">
                    VERIFY
                  </button>
                  <button class="reject-btn flex-1 sm:flex-none btn-cyber-danger !bg-rose-600 hover:!bg-rose-500 !border-rose-400 px-4 py-2 rounded-lg font-bold text-xs tracking-wide shadow-lg shadow-rose-900/50 transition-colors" data-id="${report._id}">
                    REJECT
                  </button>
                </div>
              </div>
            </div>
          
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-500 font-mono tracking-wider">USER SEVERITY:</span>
              <span class="text-sm font-semibold text-rose-300">${report.severity}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-500 font-mono tracking-wider">LOCATION:</span>
              <span class="text-sm font-mono text-cyan-400">${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</span>
            </div>
            ${report.assignmentDistanceKm !== null ? `
            <div class="flex flex-col col-span-2 mt-2">
              <span class="text-[10px] text-slate-500 font-mono tracking-wider">DISTANCE FROM STATION:</span>
              <span class="text-sm font-semibold text-blue-300">${report.assignmentDistanceKm} km</span>
            </div>` : ''}
          </div>
          
          <div class="mt-3 text-sm text-slate-300">
            <span class="text-[10px] text-slate-500 font-mono tracking-wider block mb-1">DESCRIPTION:</span>
            ${report.description}
          </div>

          <div class="mt-4 pt-4 border-t border-slate-700/50">
            ${aiSection}
          </div>
        </div>
      </div>
    `;
  },

  showError(msg) {
    this.reportsList.innerHTML = `
      <div class="text-center p-6 bg-rose-900/20 rounded-lg border border-rose-500/30">
        <p class="text-sm text-rose-400">${msg}</p>
      </div>
    `;
  },

  initSocket() {
    const token = localStorage.getItem('saferoute_token');
    if (!token || typeof io === 'undefined') return;

    this.socket = io(window.location.origin, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      this.showToast('Real-time connection restored', 'success');
      // Refetch reports to ensure we didn't miss anything while disconnected
      this.fetchPendingReports();
    });

    this.socket.on('disconnect', () => {
      this.showToast('Real-time connection lost', 'error');
    });

    this.socket.on('accident:new', (report) => {
      // Prevent duplicates
      if (document.getElementById(`report-${report._id}`)) return;

      // Remove "No pending reports" message if it exists
      if (this.reportsList.children.length === 1 && this.reportsList.children[0].textContent.includes('No pending reports')) {
        this.reportsList.innerHTML = '';
      }

      // Add to top of list
      const html = this.createReportHTML(report);
      this.reportsList.insertAdjacentHTML('afterbegin', html);

      // Show notification toast
      this.showNewAccidentToast(report);
    });
  },

  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bg = type === 'error' ? 'bg-rose-900/90 border-rose-500' : 'bg-slate-800/90 border-slate-600';
    const text = type === 'error' ? 'text-rose-200' : 'text-slate-200';
    
    toast.className = `${bg} ${text} border px-4 py-2 rounded shadow-lg text-xs font-mono animate-fade-in-up`;
    toast.textContent = msg;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  },

  showNewAccidentToast(report) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `bg-cyber-dark/95 border border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] rounded-lg p-4 animate-fade-in-up flex flex-col gap-2 min-w-[250px] backdrop-blur-md`;
    
    toast.innerHTML = `
      <div class="flex items-center gap-2 border-b border-rose-500/30 pb-2">
        <span class="text-rose-500 text-lg animate-pulse">🚨</span>
        <span class="text-rose-400 font-bold text-sm tracking-wide">NEW ACCIDENT REPORT</span>
      </div>
      <div class="flex flex-col gap-1 mt-1">
        <span class="text-white font-bold text-sm">${report.accidentType}</span>
        <span class="text-xs text-slate-300">Severity: <span class="text-rose-300 font-semibold">${report.severity}</span></span>
        ${report.assignmentDistanceKm ? `<span class="text-xs text-slate-300">Distance: <span class="text-cyan-400 font-mono">${report.assignmentDistanceKm} km</span></span>` : ''}
      </div>
      <button class="mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-white py-1.5 rounded border border-slate-600 transition-colors">
        View Report
      </button>
    `;

    toast.querySelector('button').addEventListener('click', () => {
      toast.remove();
      // Scroll to the report
      const card = document.getElementById(`report-${report._id}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('ring-2', 'ring-rose-500', 'ring-offset-2', 'ring-offset-cyber-dark');
        setTimeout(() => card.classList.remove('ring-2', 'ring-rose-500', 'ring-offset-2', 'ring-offset-cyber-dark'), 2000);
      }
    });

    container.appendChild(toast);

    // Auto dismiss after 10 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
      }
    }, 10000);
  }
};

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.3s ease-out forwards;
  }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
  // 1. Protect route
  if (!auth.protectRoute(['POLICE'])) {
    return; // Redirect happens in protectRoute
  }

  // 2. Initialize UI with user data
  const user = auth.getUser();
  if (user) {
    document.getElementById('currentUserName').textContent = user.name;
    document.getElementById('userInitial').textContent = user.name.charAt(0).toUpperCase();
  }

  // 3. Setup Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.logout();
  });

  // 4. Initialize Dashboard
  PoliceDashboardService.init();
  
  // 5. Initialize Socket.io
  PoliceDashboardService.initSocket();
});
