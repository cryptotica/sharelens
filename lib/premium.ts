export type Ratio = { numerator: bigint; denominator: bigint };

export function premium(pool: Ratio, reference: Ratio, state: "fresh" | "stale" | "paused") {
  if (pool.numerator <= 0n || pool.denominator <= 0n || reference.numerator <= 0n || reference.denominator <= 0n) {
    throw new Error("Prices must be positive.");
  }
  if (state !== "fresh") return { status: state, percent: null, difference: null };
  const delta = pool.numerator * reference.denominator - reference.numerator * pool.denominator;
  const base = reference.numerator * pool.denominator;
  // Compare integers before display rounding: exactly 0.30% and 1.00% are yellow.
  const status = delta * 10_000n < base * 30n ? "ok" : delta * 100n <= base ? "warn" : "stop";
  return {
    status,
    percent: Number(delta) / Number(base) * 100,
    difference: Number(delta) / Number(pool.denominator * reference.denominator),
  };
}
