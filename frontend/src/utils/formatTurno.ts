export function formatTurno(turno: string): string {
  const nombres: Record<string, string> = { T1: 'Turno 1', T2: 'Turno 2', T3: 'Turno 3' }
  return nombres[turno] ?? turno
}
