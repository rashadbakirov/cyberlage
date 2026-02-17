// © 2025 CyberLage
import type { ThreatLevel } from '@/lib/threatScore';
import { t, type Locale } from '@/lib/translations';

interface ThreatScoreBannerProps {
  threat: ThreatLevel;
  stats: {
    critical: number;
    high: number;
    exploited: number;
    zeroDays: number;
  };
  date: string;
  locale: Locale;
}

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 75) return { letter: "A", color: "text-red-600" };
  if (score >= 50) return { letter: "B", color: "text-orange-500" };
  if (score >= 30) return { letter: "C", color: "text-amber-500" };
  if (score >= 15) return { letter: "D", color: "text-green-600" };
  return { letter: "E", color: "text-green-700" };
}

export default function ThreatScoreBanner({ threat, stats, date, locale }: ThreatScoreBannerProps) {
  const bgClass = {
    emerald: 'bg-emerald-50 border-emerald-200',
    amber: 'bg-amber-50 border-amber-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
  }[threat.color];

  const textClass = {
    emerald: 'text-emerald-800',
    amber: 'text-amber-800',
    orange: 'text-orange-800',
    red: 'text-red-800',
  }[threat.color];

  const barClass = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  }[threat.color];

  const label = locale === 'de' ? threat.labelDe : threat.labelEn;
  const grade = getGrade(threat.score);

  return (
    <div className={`rounded-xl border p-4 mb-6 ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{threat.emoji}</span>
          <span className={`text-base font-semibold ${textClass}`}>
            {t('threat_level', locale)}: {label.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold ${grade.color} bg-white/20 border-2 border-current`}
          >
            {grade.letter}
          </div>
          <span className={`text-2xl font-bold font-mono ${textClass}`}>
            {threat.score}
            <span className="text-sm font-normal opacity-60">/100</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/50 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${threat.score}%` }}
        />
      </div>

      <p className={`text-xs ${textClass} opacity-70`}>
        {stats.critical > 0 && `${stats.critical} ${locale === 'de' ? 'kritische' : 'critical'} · `}
        {stats.high > 0 && `${stats.high} ${locale === 'de' ? 'hohe' : 'high'} · `}
        {stats.exploited > 0 && `${stats.exploited} ${locale === 'de' ? 'aktiv ausgenutzt' : 'actively exploited'} · `}
        {stats.zeroDays > 0 && `${stats.zeroDays} Zero-Day · `}
        {date}
      </p>
    </div>
  );
}


