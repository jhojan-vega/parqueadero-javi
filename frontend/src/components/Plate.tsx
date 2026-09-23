interface PlateProps { value: string }
const formatPlate = (value: string) => value.toUpperCase().replace(/^([A-Z]{3})(\d{2,3}[A-Z]?)$/, '$1 $2')
export function Plate({ value }: PlateProps) { return value.startsWith('ID:') ? <span className="identifier">{value}</span> : <span className="plate">{formatPlate(value)}</span> }
