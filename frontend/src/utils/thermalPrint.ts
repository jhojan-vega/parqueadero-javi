/** Reutiliza la configuración térmica de 58 mm para todos los recibos operativos. */
export const printThermalReceipt = (): void => {
  document.body.classList.remove('printing-report')

  const thermalPageStyle = document.createElement('style')
  thermalPageStyle.textContent = '@page { size: 58mm auto; margin: 2mm; }'
  document.head.appendChild(thermalPageStyle)
  window.addEventListener('afterprint', () => thermalPageStyle.remove(), { once: true })
  window.print()
}
