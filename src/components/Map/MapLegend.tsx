export const MapLegend = () => {
  // Static legend kept for simplicity; map uses dynamic quantile ramps for better variance
  const legendItems = [
    { color: '#08519c', label: 'Low risk (relative)' },
    { color: '#6baed6', label: 'Low-Medium (relative)' },
    { color: '#eff3ff', label: 'Neutral (relative)' },
    { color: '#fcae91', label: 'High (relative)' },
    { color: '#de2d26', label: 'Critical (relative)' },
  ];

  return (
    <div className="absolute bottom-8 left-8 bg-card/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-border max-w-xs">
      <h3 className="text-sm font-semibold mb-3 text-foreground">Climate Inequality Index (CII)</h3>
      <div className="space-y-2">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-8 h-4 rounded border border-border/50"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
        Colors scale to current data distribution for better contrast
      </p>
    </div>
  );
};