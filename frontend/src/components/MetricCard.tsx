interface MetricCardProps { label: string; icon: string; occupied: number; capacity: number }
export function MetricCard({ label, icon, occupied, capacity }: MetricCardProps) {
  const available = capacity - occupied; const percentage = Math.round((occupied / capacity) * 100)
  return <article className="metric-card"><div className="metric-icon" aria-hidden="true">{icon}</div><div className="metric-content"><span>{label}</span><strong>{available} <em>libres</em></strong><small>{occupied} ocupados de {capacity}</small><div className="progress-row"><div className="progress-track"><span style={{ width: `${percentage}%` }} /></div><b>{percentage}%</b></div></div></article>
}
