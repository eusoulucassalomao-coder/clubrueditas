// Endereços das outras "portas" do restaurante. Trocar aqui quando houver domínio próprio.
export const CARTA_URL = 'https://laruedita-carta.vercel.app/';
export const DELIVERY_URL = 'https://laruedita-carta.vercel.app/delivery';

/** Abre numa nova aba/tela, sem dar acesso à janela do app à página aberta. */
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
