const fs = require('fs');
const file = 'c:/MP/SafeRoute/backend/src/services/hotspot/hotspotService.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const MIN_ACCIDENTS = parseInt\\(process\\.env\\.HOTSPOT_MIN_ACCIDENTS\\) \\|\\| 2;/g, 'const MIN_ACCIDENTS = 1;');
fs.writeFileSync(file, content);

