const fs = require('fs');
const file = 'c:/MP/SafeRoute/frontend/js/policeDashboard.js';
let content = fs.readFileSync(file, 'utf8');

// Regex to find the whole flex justify-between block
const regex = /<div class="flex justify-between items-start">[\s\S]*?<div class="flex gap-2">[\s\S]*?<button class="verify-btn[\s\S]*?<\/div>\s*<\/div>/;

const newBlock = `<div class="flex flex-col xl:flex-row justify-between items-start gap-4">
              <div>
                <h3 class="text-lg font-bold text-white">\${report.accidentType}</h3>
                <p class="text-xs text-slate-400 font-mono">\${date}</p>
              </div>
              
              <div class="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=\${report.latitude},\${report.longitude}&travelmode=driving', '_blank')" class="btn-cyber-primary !bg-cyan-600 hover:!bg-cyan-500 !border-cyan-400 px-4 py-2 rounded-lg font-bold text-xs tracking-wide shadow-lg shadow-cyan-900/50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                  <i class="ph-bold ph-navigation-arrow"></i> NAVIGATE TO ACCIDENT
                </button>
                <div class="flex gap-2 w-full sm:w-auto">
                  <button class="verify-btn flex-1 sm:flex-none btn-cyber-primary !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-400 px-4 py-2 rounded-lg font-bold text-xs tracking-wide shadow-lg shadow-emerald-900/50 transition-colors" data-id="\${report._id}">
                    VERIFY
                  </button>
                  <button class="reject-btn flex-1 sm:flex-none btn-cyber-danger !bg-rose-600 hover:!bg-rose-500 !border-rose-400 px-4 py-2 rounded-lg font-bold text-xs tracking-wide shadow-lg shadow-rose-900/50 transition-colors" data-id="\${report._id}">
                    REJECT
                  </button>
                </div>
              </div>
            </div>`;

if (regex.test(content)) {
  content = content.replace(regex, newBlock);
  fs.writeFileSync(file, content);
  console.log('Success');
} else {
  console.log('Block not found.');
}
