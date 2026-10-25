const fs = require('fs');
const file = 'c:/MP/SafeRoute/frontend/index.html';
let content = fs.readFileSync(file, 'utf8');

const oldHero = `        <!-- Hero Visual (Mock Map) -->
        <div class="relative lg:ml-auto w-full max-w-lg aspect-[4/3] rounded-2xl border border-slate-800 bg-[#0b0f19] shadow-2xl overflow-hidden p-4 group">
          <!-- Mock Map Background Grid -->
          <div class="absolute inset-0 bg-grid opacity-30"></div>
          
          <!-- Mock Route Line -->
          <svg class="absolute inset-0 w-full h-full text-brand-cyan/40" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 10 90 Q 40 80, 50 50 T 90 10" fill="none" stroke="currentColor" stroke-width="2" class="mock-route"></path>
          </svg>

          <!-- Mock UI Elements -->
          <div class="absolute top-8 right-8 w-12 h-12 rounded-full bg-brand-cyan/20 border border-brand-cyan/50 flex items-center justify-center animate-pulse">
            <div class="w-3 h-3 bg-brand-cyan rounded-full"></div>
          </div>
          
          <div class="absolute bottom-16 left-16 pulse-marker-incident scale-75">
            <i class="ph-bold ph-warning"></i>
          </div>

          <!-- Glass Floating Card -->
          <div class="absolute bottom-6 left-1/2 -translate-x-1/2 w-11/12 glass-panel p-3 flex items-center gap-4">
            <div class="pulse-marker-ambulance scale-[0.6] shrink-0 m-0 relative -left-1">
              <i class="ph-bold ph-ambulance"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-brand-cyan uppercase tracking-wider">Responder Alerted</div>
              <div class="text-xs text-slate-300">ETA: 3 mins to incident zone</div>
            </div>
          </div>
        </div>`;

const newHero = `        <!-- Hero Visual (Mock Map) -->
        <div class="relative lg:ml-auto w-full max-w-lg aspect-[4/3] rounded-2xl border border-slate-800 bg-[#060a14] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden group">
          
          <!-- Mock Map Background Grid -->
          <div class="absolute inset-0 bg-grid opacity-20"></div>
          
          <!-- Top Left LIVE RESPONSE indicator -->
          <div class="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[#0b0f19]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/50">
            <div class="w-2 h-2 rounded-full bg-brand-red animate-pulse shadow-[0_0_8px_#ef4444]"></div>
            <span class="text-[10px] font-bold text-slate-300 tracking-widest uppercase">LIVE RESPONSE</span>
          </div>

          <!-- Road Network SVG -->
          <svg class="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
            <defs>
              <filter id="mock-glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <!-- Background generic roads -->
            <path d="M -20 100 L 420 80 M 150 -20 L 120 320 M -20 220 L 420 240 M 300 -20 L 280 320" fill="none" stroke="#1e293b" stroke-width="2"/>
            <path d="M -20 50 L 150 100 L 300 80 L 420 120" fill="none" stroke="#1e293b" stroke-width="1"/>
            
            <!-- Hotspot Area -->
            <circle cx="280" cy="100" r="45" fill="#f59e0b" fill-opacity="0.05" stroke="#f59e0b" stroke-opacity="0.2" stroke-width="1" class="mock-hotspot-breathe"/>
            
            <!-- The Active Route -->
            <path d="M 120 260 L 120 230 L 280 240 L 280 100" fill="none" stroke="#00f0ff" stroke-width="4" stroke-opacity="0.3" filter="url(#mock-glow)"/>
            <path d="M 120 260 L 120 230 L 280 240 L 280 100" fill="none" stroke="#00f0ff" stroke-width="2" class="mock-route-dash" filter="url(#mock-glow)"/>
            
            <!-- Ambulance Marker inside SVG via SMIL -->
            <g>
              <animateMotion dur="5s" repeatCount="indefinite" path="M 120 260 L 120 230 L 280 240 L 280 100" />
              <!-- Label -->
              <rect x="-35" y="-35" width="70" height="16" fill="#0b0f19" fill-opacity="0.9" stroke="#334155" stroke-width="1" rx="4"/>
              <text x="0" y="-24" font-size="8" font-family="sans-serif" font-weight="bold" fill="#00f0ff" text-anchor="middle" letter-spacing="1">AMBULANCE</text>
              
              <!-- Circle Marker -->
              <circle cx="0" cy="0" r="12" fill="#2563eb" stroke="#00f0ff" stroke-width="2" filter="url(#mock-glow)"/>
              <!-- Cross -->
              <path d="M -2 -5 L 2 -5 L 2 -2 L 5 -2 L 5 2 L 2 2 L 2 5 L -2 5 L -2 2 L -5 2 L -5 -2 L -2 -2 Z" fill="#ffffff"/>
            </g>
          </svg>

          <!-- Hotspot Label -->
          <div class="absolute z-10 text-center pointer-events-none" style="top: 18%; left: 70%; transform: translate(-50%, -50%);">
            <div class="text-[9px] font-bold text-brand-amber/80 tracking-widest uppercase">ACCIDENT HOTSPOT</div>
          </div>

          <!-- Accident Marker -->
          <div class="absolute z-20 flex flex-col items-center justify-center pointer-events-none" style="top: 33.3%; left: 70%; transform: translate(-50%, -50%);">
            <!-- Pulse Ring -->
            <div class="absolute w-12 h-12 bg-brand-red/20 rounded-full animate-ping"></div>
            <div class="w-8 h-8 rounded-full bg-brand-red border-2 border-red-200 flex items-center justify-center text-white shadow-[0_0_15px_#ef4444] z-10 relative">
              <i class="ph-bold ph-warning text-sm"></i>
            </div>
            <!-- Label -->
            <div class="mt-2 bg-[#0b0f19]/90 border border-slate-700/50 px-2 py-1 rounded backdrop-blur-sm text-center">
              <div class="text-[10px] font-bold text-red-400 tracking-wider">ACCIDENT</div>
              <div class="text-[8px] font-bold text-emerald-400 tracking-wider mt-0.5">AI VERIFIED</div>
            </div>
          </div>

          <!-- Small Map Labels (Police Station) -->
          <div class="absolute z-10 flex flex-col items-center pointer-events-none" style="top: 80%; left: 80%; transform: translate(-50%, -50%);">
            <div class="w-5 h-5 rounded bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400">
              <i class="ph-fill ph-shield-star text-[10px]"></i>
            </div>
            <div class="text-[8px] font-bold text-slate-500 tracking-wider mt-1">POLICE STATION</div>
          </div>

          <!-- Glass Status Panel -->
          <div class="absolute bottom-4 left-4 right-4 z-30 glass-panel p-3 bg-[#0f172a]/90 border-slate-700/80 backdrop-blur-md">
            <h3 class="text-[10px] font-bold text-white tracking-widest uppercase border-b border-slate-700 pb-2 mb-2 flex items-center gap-2">
              <i class="ph-bold ph-broadcast text-brand-cyan"></i> LIVE INCIDENT RESPONSE
            </h3>
            
            <div class="space-y-1.5">
              <div class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-brand-red mt-1 shadow-[0_0_5px_#ef4444]"></div>
                <div>
                  <div class="text-[10px] font-bold text-slate-200 uppercase">ACCIDENT DETECTED</div>
                  <div class="text-[9px] text-slate-400">Location received</div>
                </div>
              </div>
              
              <div class="flex items-start gap-2">
                <div class="text-emerald-400 mt-0.5"><i class="ph-bold ph-check-circle text-[10px]"></i></div>
                <div>
                  <div class="text-[10px] font-bold text-slate-200 uppercase">AI ANALYSIS COMPLETE</div>
                  <div class="text-[9px] text-red-400 font-semibold">Severity: SEVERE</div>
                </div>
              </div>
              
              <div class="flex items-start gap-2">
                <div class="text-brand-cyan mt-0.5"><i class="ph-bold ph-ambulance text-[10px] animate-pulse"></i></div>
                <div>
                  <div class="text-[10px] font-bold text-brand-cyan uppercase">AMBULANCE DISPATCHED</div>
                  <div class="text-[9px] text-slate-400">ETA: <span class="text-white font-bold">6 min</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>`;

content = content.replace(oldHero, newHero);
fs.writeFileSync(file, content);
