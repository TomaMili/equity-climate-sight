import { useCountUp } from '@/hooks/useCountUp';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  subtitle: string;
  suffix?: string;
  isLoading?: boolean;
}

export function StatCard({ icon: Icon, value, label, subtitle, suffix = '', isLoading }: StatCardProps) {
  const { count, elementRef } = useCountUp({ end: value, duration: 2500 });

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div
      ref={elementRef}
      className="group rounded-2xl border bg-card/80 backdrop-blur-sm p-6 hover:shadow-xl hover:border-primary/40 transition-all duration-300 hover-scale text-center"
    >
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <div className="text-4xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
        {isLoading ? (
          <div className="h-10 w-24 mx-auto bg-muted/50 animate-pulse rounded" />
        ) : (
          <>
            {formatNumber(count)}
            {suffix}
          </>
        )}
      </div>
      <div className="text-sm font-medium text-foreground mb-1">{label}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}
