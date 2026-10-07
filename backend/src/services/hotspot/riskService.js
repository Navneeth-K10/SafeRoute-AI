// Load config or use defaults
const DECAY_DAYS = parseFloat(process.env.HOTSPOT_DECAY_DAYS) || 180;
const LOW_THRESHOLD = parseFloat(process.env.HOTSPOT_LOW_THRESHOLD) || 2;
const MODERATE_THRESHOLD = parseFloat(process.env.HOTSPOT_MODERATE_THRESHOLD) || 5;
const HIGH_THRESHOLD = parseFloat(process.env.HOTSPOT_HIGH_THRESHOLD) || 10;
const CRITICAL_THRESHOLD = parseFloat(process.env.HOTSPOT_CRITICAL_THRESHOLD) || 20;

/**
 * Get numerical weight for accident severity
 */
function getSeverityWeight(severity) {
  switch (severity?.toUpperCase()) {
    case 'SEVERE': return 3.0;
    case 'MODERATE': return 2.0;
    case 'MINOR': return 1.0;
    default: return 1.0; // fallback
  }
}

/**
 * Calculate time weight using exponential decay
 * weight = exp(-ageInDays / DECAY_DAYS)
 */
function getTimeWeight(createdAt) {
  const ageInMs = Date.now() - new Date(createdAt).getTime();
  const ageInDays = Math.max(0, ageInMs / (1000 * 60 * 60 * 24));
  return Math.exp(-ageInDays / DECAY_DAYS);
}

/**
 * Calculate the total risk score for a set of accidents
 */
function calculateRiskScore(accidents) {
  if (!accidents || accidents.length === 0) return 0;
  
  const totalScore = accidents.reduce((score, acc) => {
    const severityWeight = getSeverityWeight(acc.severity);
    const timeWeight = getTimeWeight(acc.createdAt);
    return score + (severityWeight * timeWeight);
  }, 0);
  
  return Number(totalScore.toFixed(2));
}

/**
 * Map numerical risk score to risk level string
 */
function getRiskLevel(riskScore) {
  if (riskScore >= CRITICAL_THRESHOLD) return 'CRITICAL';
  if (riskScore >= HIGH_THRESHOLD) return 'HIGH';
  if (riskScore >= MODERATE_THRESHOLD) return 'MODERATE';
  return 'LOW';
}

module.exports = {
  calculateRiskScore,
  getRiskLevel
};
