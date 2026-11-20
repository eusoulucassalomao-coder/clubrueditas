// Endereços das outras "portas" do restaurante. Trocar aqui quando houver domínio próprio.
export const CARTA_URL = 'https://laruedita-carta.vercel.app/';
export const DELIVERY_URL = 'https://laruedita-carta.vercel.app/delivery';

// Contato do restaurante (reservas e atendimento humano)
export const WHATSAPP_NUMBER = '5493764236680';
export const WHATSAPP_NUMBER_LABEL = '+54 9 3764 23-6680';
export const RESTAURANT_ADDRESS = 'Alfonso de Arrechea 835, N3301 Posadas, Misiones';
export const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('Alfonso de Arrechea 835, Posadas, Misiones');

export function whatsappUrl(message?: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** Abre numa nova aba/tela, sem dar acesso à janela do app à página aberta. */
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
