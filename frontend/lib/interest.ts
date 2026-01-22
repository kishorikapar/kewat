export type InterestMode = 'simple_monthly' | 'compound_monthly';

export function percentToBps(percent: number) {
  return Math.round(percent * 100);
}

export function bpsToPercent(bps: number) {
  return bps / 100;
}

// Calculates monthly interest on outstanding principal.
// - simple_monthly: interest = principal * rate
// - compound_monthly: returns new principal after adding interest (if you want to roll it)
export function calculateMonthlyInterestPaisa(params: {
  principalPaisa: number;
  rateBps: number;
  mode: InterestMode;
}) {
  const { principalPaisa, rateBps } = params;
  const rate = rateBps / 10000;
  const interest = Math.round(principalPaisa * rate);

  if (params.mode === 'compound_monthly') {
    return { interestPaisa: interest, nextPrincipalPaisa: principalPaisa + interest };
  }

  return { interestPaisa: interest, nextPrincipalPaisa: principalPaisa };
}
