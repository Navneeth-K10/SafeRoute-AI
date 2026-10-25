const fs = require('fs');
const file = 'c:/MP/SafeRoute/backend/src/services/hotspot/hotspotService.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('const MIN_ACCIDENTS = parseInt(process.env.HOTSPOT_MIN_ACCIDENTS) ||const MIN_ACCIDENTS = 1;', 'const MIN_ACCIDENTS = 1;');
// Let's also handle the case if it wasn't replaced properly.
content = content.replace('const MIN_ACCIDENTS = parseInt(process.env.HOTSPOT_MIN_ACCIDENTS) || 2;', 'const MIN_ACCIDENTS = 1;');
fs.writeFileSync(file, content);
