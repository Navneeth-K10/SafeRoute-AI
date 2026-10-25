const SafeRouteHotspotWarning = {
  elements: {},
  
  // Tailwind color classes to apply to specific elements
  styles: {
    LOW: { border: 'border-emerald-500/50', text: 'text-emerald-400', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' },
    MODERATE: { border: 'border-amber-400/50', text: 'text-amber-400', shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' },
    HIGH: { border: 'border-orange-500/50', text: 'text-orange-500', shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]' },
    CRITICAL: { border: 'border-rose-600/50', text: 'text-rose-500', shadow: 'shadow-[0_0_20px_rgba(225,29,72,0.3)]', pulse: true }
  },

  init() {
    this.elements = {
      container: document.getElementById('hotspotWarningContainer'),
      card: document.getElementById('hotspotWarningCard'),
      icon: document.getElementById('hotspotWarningIcon'),
      title: document.getElementById('hotspotWarningTitle'),
      risk: document.getElementById('hotspotWarningRisk'),
      distance: document.getElementById('hotspotWarningDistance'),
      count: document.getElementById('hotspotWarningCount'),
      radius: document.getElementById('hotspotWarningRadius'),
      footerMsg: document.getElementById('hotspotWarningFooterMsg')
    };

    if (!this.elements.container) {
      console.warn('[WARNING UI] Container not found');
      return;
    }

    // Subscribe to proximity updates
    if (window.SafeRouteHotspotProximity) {
      window.SafeRouteHotspotProximity.subscribe(this.handleProximityUpdate.bind(this));
    }
  },

  handleProximityUpdate(proximity) {
    if (!proximity || proximity.hotspotId === null || proximity.state === 'OUTSIDE_HOTSPOT') {
      this.hideWarning();
      return;
    }

    this.showWarning(proximity);
  },

  showWarning(proximity) {
    const { state, riskLevel, distanceMeters, accidentCount, hotspotRadiusMeters } = proximity;

    // Apply Content
    this.elements.count.textContent = accidentCount;
    this.elements.radius.textContent = hotspotRadiusMeters + ' m';
    this.elements.risk.textContent = riskLevel + ' RISK';

    // Format Distance
    if (distanceMeters >= 1000) {
      this.elements.distance.textContent = (distanceMeters / 1000).toFixed(1) + ' km away';
    } else {
      this.elements.distance.textContent = Math.round(distanceMeters) + ' m away';
    }

    // Apply State specific logic
    if (state === 'APPROACHING_HOTSPOT') {
      this.elements.title.textContent = 'Accident-Prone Area Ahead';
      this.elements.icon.textContent = '⚠️';
      this.elements.footerMsg.textContent = 'Drive carefully.';
    } else if (state === 'INSIDE_HOTSPOT') {
      this.elements.title.textContent = 'You Are Inside an Accident Hotspot';
      this.elements.icon.textContent = '🔴';
      this.elements.footerMsg.textContent = 'High alert area.';
    }

    // Apply Styling
    this.applyStyling(riskLevel);

    // Show Container with animation (fade in & slide down slightly)
    this.elements.container.classList.remove('hidden', '-translate-y-4', 'opacity-0');
    this.elements.container.classList.add('translate-y-0', 'opacity-100');
  },

  hideWarning() {
    this.elements.container.classList.remove('translate-y-0', 'opacity-100');
    this.elements.container.classList.add('-translate-y-4', 'opacity-0');
    
    // Hide completely after transition
    setTimeout(() => {
      // Check again to avoid race conditions if user immediately re-entered
      const current = window.SafeRouteHotspotProximity?.getCurrentProximity();
      if (!current || current.state === 'OUTSIDE_HOTSPOT' || current.hotspotId === null) {
        this.elements.container.classList.add('hidden');
      }
    }, 300);
  },

  applyStyling(riskLevel) {
    const style = this.styles[riskLevel] || this.styles.LOW;
    const card = this.elements.card;
    const riskText = this.elements.risk;

    // Clean up previous classes safely
    card.className = 'bg-slate-800/95 backdrop-blur-md border shadow-2xl rounded-xl p-4 flex flex-col gap-3 transition-colors duration-300';
    riskText.className = 'text-xs font-bold mt-0.5 transition-colors duration-300';

    // Add new styles
    card.classList.add(style.border);
    // Note: We use shadow on the container for the glow effect
    if (style.shadow) card.classList.add(style.shadow);
    if (style.pulse) card.classList.add('animate-pulse');
    
    riskText.classList.add(style.text);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  SafeRouteHotspotWarning.init();
});
