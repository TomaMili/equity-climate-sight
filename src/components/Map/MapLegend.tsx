export const MapLegend = () => {
  const legendItems = [
    { color: '#1a9850', label: '0.0 - 0.3 (Low Risk)', range: '0.0-0.3' },
    { color: '#91cf60', label: '0.3 - 0.5 (Low-Medium)', range: '0.3-0.5' },
    { color: '#ffffbf', label: '0.5 - 0.7 (Medium)', range: '0.5-0.7' },
    { color: '#fc8d59', label: '0.7 - 0.9 (High)', range: '0.7-0.9' },
    { color: '#d73027', label: '0.9 - 1.0 (Critical)', range: '0.9-1.0' },
  ];

  return (
    <div className="absolute bottom-8 left-8 bg-card/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-border max-w-xs">
      <h3 className="text-sm font-semibold mb-3 text-foreground">Climate Inequality Index (CII)</h3>
      <div className="space-y-2">
        {legendItems.map((item) => (
          <div key={item.range} className="flex items-center gap-2">
            <div
              className="w-8 h-4 rounded border border-border/50"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
        Higher values indicate greater climate inequality
      </p>
    </div>
  );
};