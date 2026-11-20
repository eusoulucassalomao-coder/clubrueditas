import React, { useMemo } from 'react';
import qrcode from 'qrcode-generator';

interface VoucherQrProps {
  /** Código do cupom (o QR leva só o código; o caixa/tablet confere no banco). */
  code: string;
  label: string;
}

/** QR do cupom de prêmio, no mesmo formato do cupom que a pessoa recebe pelo tablet. */
export const VoucherQr: React.FC<VoucherQrProps> = ({ code, label }) => {
  const svg = useMemo(() => {
    if (!code) return '';
    const qr = qrcode(0, 'M');
    qr.addData(code);
    qr.make();
    // o SVG é gerado aqui a partir do código (só retângulos), sem conteúdo de terceiros
    return qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
  }, [code]);

  if (!svg) return null;
  return (
    <div
      role="img"
      aria-label={label}
      className="mx-auto mt-4 w-44 sm:w-48 rounded-2xl bg-white border border-[#E7DFCC] p-2 [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
