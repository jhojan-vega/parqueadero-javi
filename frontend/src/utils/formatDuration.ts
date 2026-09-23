/** Convierte minutos enteros a un texto legible, sin alterar el valor original. */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.trunc(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) {
    return `${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'}`
  }

  const hourText = `${hours} ${hours === 1 ? 'hora' : 'horas'}`
  if (remainingMinutes === 0) return hourText

  return `${hourText} ${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'}`
}
