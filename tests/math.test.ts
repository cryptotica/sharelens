import assert from "node:assert/strict";
import test from "node:test";
import { parseAmount, rawToScaled } from "../lib/b20";
import { oracleState, STALE_SECONDS } from "../lib/oracle";
import { poolRatio } from "../lib/pool";
import { premium } from "../lib/premium";

test("premium uses exact thresholds, signed discounts and no multiplier", () => {
  for (const [price, expected] of [[99000n, "ok"], [100299n, "ok"], [100300n, "warn"], [101000n, "warn"], [101001n, "stop"]] as const) {
    assert.equal(premium({ numerator: price, denominator: 1000n }, { numerator: 100n, denominator: 1n }, "fresh").status, expected);
  }
  assert.equal(premium({ numerator: 99n, denominator: 1n }, { numerator: 100n, denominator: 1n }, "fresh").percent, -1);
  for (const state of ["stale", "paused"] as const) {
    assert.deepEqual(premium({ numerator: 100n, denominator: 1n }, { numerator: 100n, denominator: 1n }, state), { status: state, percent: null, difference: null });
  }
  assert.throws(() => premium({ numerator: 0n, denominator: 1n }, { numerator: 100n, denominator: 1n }, "fresh"));
});

test("raw-to-scaled retains bigint precision and floors base units", () => {
  const wad = 10n ** 18n;
  assert.equal(rawToScaled(parseAmount("1.25", 18), 102n * wad / 100n, wad), 1275n * wad / 1000n);
  assert.equal(rawToScaled(1n, 15n, 10n), 1n);
  assert.equal(rawToScaled(0n, wad, wad), 0n);
  assert.equal(rawToScaled(9007199254740993n, wad, wad), 9007199254740993n);
  assert.throws(() => rawToScaled(1n, wad, 0n));
  for (const value of ["", "-1", "1e3", "0.0000001", "NaN"]) assert.throws(() => parseAmount(value, 6));
});

test("oracle freshness is strictly older than 36 hours; pause wins", () => {
  assert.equal(oracleState(1, 1 + STALE_SECONDS, false), "fresh");
  assert.equal(oracleState(1, 2 + STALE_SECONDS, false), "stale");
  assert.equal(oracleState(1, 2, true), "paused");
  assert.throws(() => oracleState(0, 2, false));
  assert.throws(() => oracleState(3, 2, false));
});

test("pool observation handles both token orders and 18/6 decimals", () => {
  for (const tokenIs0 of [true, false]) {
    const ratio = poolRatio(2n ** 96n, tokenIs0, 18, 6);
    assert.equal(ratio.numerator / ratio.denominator, 10n ** 12n);
  }
  const forward = poolRatio(2n ** 97n, true, 6, 6);
  const reverse = poolRatio(2n ** 97n, false, 6, 6);
  assert.equal(forward.numerator / forward.denominator, 4n);
  assert.equal(reverse.denominator / reverse.numerator, 4n);
});
