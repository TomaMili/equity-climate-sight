import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CIIBreakdownProps {
  climateRisk: number | null;
  infrastructureGap: number | null;
  socioeconomicVuln: number | null;
  airQuality: number | null;
}

const CIIBreakdown = ({ 
  climateRisk, 
  infrastructureGap, 
  socioeconomicVuln, 
  airQuality 
}: CIIBreakdownProps) => {
  // Check if we have any component data
  const hasData = climateRisk !== null || infrastructureGap !== null || 
                  socioeconomicVuln !== null || airQuality !== null;

  if (!hasData) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base font-medium">CII Component Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Component breakdown not available for this region yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = [
    { name: 'Climate Risk', value: climateRisk, weight: '30%', color: 'hsl(var(--destructive))' },
    { name: 'Infrastructure', value: infrastructureGap, weight: '25%', color: 'hsl(var(--warning))' },
    { name: 'Socioeconomic', value: socioeconomicVuln, weight: '25%', color: 'hsl(var(--chart-3))' },
    { name: 'Air Quality', value: airQuality, weight: '20%', color: 'hsl(var(--chart-4))' },
  ].filter(item => item.value !== null);

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base font-medium">CII Component Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              type="number" 
              domain={[0, 1]} 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              width={90}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: number, name: string, props: any) => [
                `${(value * 100).toFixed(1)}% (Weight: ${props.payload.weight})`,
                name
              ]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Weight: {item.weight}</span>
                <span className="font-medium text-foreground">
                  {((item.value || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CIIBreakdown;
