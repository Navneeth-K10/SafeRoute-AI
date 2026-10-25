const fs = require('fs');
const file = 'c:/MP/SafeRoute/frontend/index.html';
let content = fs.readFileSync(file, 'utf8');
content = content.split('href="/register.html"').join('href="/account-type.html"');
fs.writeFileSync(file, content);
