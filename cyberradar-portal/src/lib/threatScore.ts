// © 2025 CyberLage
export interface ThreatLevel {
  score: number;           // 0-100
  level: 'normal' | 'moderat' | 'erhoht' | 'kritisch';
  labelDe: string;
  labelEn: string;
  color: string;           // tailwind color prefix: emerald, amber, orange, red
  emoji: string;
}

export function calculateDailyThreat(alerts: Array<{
  severity: string | null;
  isActivelyExploited?: boolean;
  isZeroDay?: boolean;
  aiScore: number | null;
}>): ThreatLevel {
  if (alerts.length === 0) {
    return {
      score: 0,
      level: 'normal',
      labelDe: 'Normal',
      labelEn: 'Normal',
      color: 'emerald',
      emoji: '🟢'
    };
  }

  const crit = alerts.filter(a => a.severity === 'critical').length;
  const high = alerts.filter(a => a.severity === 'high').length;
  const exploited = alerts.filter(a => a.isActivelyExploited).length;
  const zeroDays = alerts.filter(a => a.isZeroDay).length;
  const maxScore = Math.max(...alerts.map(a => a.aiScore || 0), 0);

  // Weighted formula with caps per category
  const score = Math.min(100, Math.round(
    Math.min(crit * 5, 30) +          // criticals: up to 30 points
    Math.min(high * 1.5, 20) +        // highs: up to 20 points
    Math.min(exploited * 12, 25) +    // active exploits: up to 25 points
    (zeroDays > 0 ? 15 : 0) +         // zero-day bonus: 15 points
    (maxScore * 0.1)                   // worst alert: up to 10 points
  ));

  if (score >= 75) {
    return {
      score,
      level: 'kritisch',
      labelDe: 'Kritisch',
      labelEn: 'Critical',
      color: 'red',
      emoji: '🔴'
    };
  }
  
  if (score >= 50) {
    return {
      score,
      level: 'erhoht',
      labelDe: 'Erhöht',
      labelEn: 'Elevated',
      color: 'orange',
      emoji: '🟠'
    };
  }
  
  if (score >= 30) {
    return {
      score,
      level: 'moderat',
      labelDe: 'Moderat',
      labelEn: 'Moderate',
      color: 'amber',
      emoji: '🟡'
    };
  }
  
  return {
    score,
    level: 'normal',
    labelDe: 'Normal',
    labelEn: 'Normal',
    color: 'emerald',
    emoji: '🟢'
  };
}

