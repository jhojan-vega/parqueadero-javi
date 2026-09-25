import parkingChaviLogo from '../assets/parking-chavi-logo-futurista.png'

interface ParkingChaviLogoProps {
  variant?: 'panel' | 'compact'
}

export function ParkingChaviLogo({ variant = 'panel' }: ParkingChaviLogoProps) {
  return <img className={`parking-chavi-logo parking-chavi-logo--${variant}`} src={parkingChaviLogo} alt="PARKING CHAVi — Software inteligente a tu servicio" />
}
