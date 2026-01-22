export type Currency = 'NPR';

// Store money as integer paisa to avoid floating point issues.
export function nprToPaisa(npr: number) {
  if (!Number.isFinite(npr)) return 0;
  return Math.round(npr * 100);
}

export function paisaToNpr(paisa: number) {
  if (!Number.isFinite(paisa)) return 0;
  return paisa / 100;
}

export function formatNprFromPaisa(paisa: number) {
  const npr = paisaToNpr(paisa);
  return npr.toLocaleString('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 2,
  });
}
