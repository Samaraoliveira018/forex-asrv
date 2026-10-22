import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <Card className="asrv-stat">
      <p className="asrv-stat__label">{label}</p>
      <p className="asrv-stat__value">{value}</p>
    </Card>
  );
}
