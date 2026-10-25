const AccidentHistoryService = {
  init() {
    this.reportsList = document.getElementById('myReportsList');
    this.refreshBtn = document.getElementById('refreshReportsBtn');

    if (!this.reportsList) return;

    this.bindEvents();
    this.fetchMyReports();
  },

  bindEvents() {
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.fetchMyReports());
    }
  },

  async fetchMyReports() {
    try {
      this.reportsList.innerHTML = '<div class="text-center p-4 text-xs text-slate-400 animate-pulse">Loading reports...</div>';
      
      const response = await api.fetch('/accidents/my');
      
      if (response.ok && response.data.success) {
        this.renderReports(response.data.data);
      } else {
        this.showError('Failed to load reports.');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      this.showError('Network error while loading reports.');
    }
  },

  renderReports(reports) {
    if (!reports || reports.length === 0) {
      this.reportsList.innerHTML = `
        <div class="text-center p-6 bg-slate-900/50 rounded-lg border border-slate-800">
          <p class="text-xs text-slate-400">You haven't submitted any accident reports yet.</p>
        </div>
      `;
      return;
    }

    this.reportsList.innerHTML = reports.map(report => this.createReportHTML(report)).join('');
  },

  createReportHTML(report) {
    const date = new Date(report.createdAt).toLocaleString();
    
    // Status colors
    let statusClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (report.status === 'VERIFIED') statusClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (report.status === 'REJECTED') statusClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';

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
        <div class="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-1.5">
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-400 font-mono">AI Detection:</span>
            <span class="font-bold ${detectedColor}">${detectedText}</span>
          </div>
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-400 font-mono">AI Severity:</span>
            <span class="font-bold text-white">${aiSeverity}</span>
          </div>
          <div class="flex justify-between items-center text-[10px]">
            <span class="text-slate-400 font-mono">Confidence:</span>
            <span class="font-bold text-cyan-300">${confidence}%</span>
          </div>
          <div class="mt-1 text-[10px] text-slate-400 bg-black/30 p-2 rounded border border-slate-800">
            <span class="text-cyan-500/70 block mb-0.5">Observations:</span>
            ${observations}
          </div>
        </div>
      `;
    } else {
      aiSection = `
        <div class="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-1.5">
          <div class="text-[10px] text-slate-500 italic text-center">
            AI analysis pending or unavailable.
          </div>
        </div>
      `;
    }

    return `
      <div class="bg-slate-900/80 rounded-xl p-4 border border-slate-700/60 shadow-md flex flex-col gap-2 relative overflow-hidden group">
        <!-- Status Badge -->
        <div class="absolute top-3 right-3 text-[9px] font-black tracking-widest px-2 py-0.5 rounded border ${statusClass}">
          ${report.status}
        </div>
        
        <!-- Header -->
        <div>
          <h3 class="text-sm font-bold text-white">${report.accidentType}</h3>
          <p class="text-[10px] text-slate-400 font-mono">${date}</p>
        </div>
        
        <!-- User Details -->
        <div class="grid grid-cols-2 gap-2 mt-1">
          <div class="flex flex-col">
            <span class="text-[9px] text-slate-500 uppercase tracking-wider">Your Severity</span>
            <span class="text-xs font-semibold text-rose-300">${report.severity}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[9px] text-slate-500 uppercase tracking-wider">Location</span>
            <span class="text-[10px] font-mono text-cyan-400">${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</span>
          </div>
        </div>

        ${aiSection}
      </div>
    `;
  },

  showError(msg) {
    this.reportsList.innerHTML = `
      <div class="text-center p-4 bg-rose-900/20 rounded-lg border border-rose-500/30">
        <p class="text-xs text-rose-400">${msg}</p>
      </div>
    `;
  }
};
