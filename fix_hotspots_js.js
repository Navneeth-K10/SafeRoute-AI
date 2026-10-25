const fs = require('fs');
const file = 'c:/MP/SafeRoute/frontend/js/hotspots.js';
let content = fs.readFileSync(file, 'utf8');

const oldCircle = `    // 1. Create the Radius Circle
    const circle = new google.maps.Circle({
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.15,`;

const newCircle = `    const opacityMap = {
      LOW: { fill: 0.12, stroke: 0.45 },
      MODERATE: { fill: 0.16, stroke: 0.55 },
      HIGH: { fill: 0.20, stroke: 0.65 },
      CRITICAL: { fill: 0.25, stroke: 0.75 }
    };
    const opacities = opacityMap[hotspot.riskLevel] || opacityMap.LOW;

    // 1. Create the Radius Circle
    const circle = new google.maps.Circle({
      strokeColor: color,
      strokeOpacity: opacities.stroke,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: opacities.fill,`;

content = content.replace(oldCircle, newCircle);
content = content.replace(/glyph:\s*'.*?'/, "glyph: '!'");

fs.writeFileSync(file, content);
