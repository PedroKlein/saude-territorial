/**
 * CNS (Cartão Nacional de Saúde) — SUS national health card helpers.
 *
 * CNS is 15 digits and carries a checksum. The DATASUS algorithm assigns
 * weights `15, 14, 13, ..., 1` to positions `0..14` and requires that the
 * resulting weighted sum is divisible by 11. Both the "definitive" family
 * (prefix `1` or `2`) and the "provisional" family (prefix `7`, `8`, or `9`)
 * share this invariant even though they build the tail differently.
 *
 * The plan calls the check a "Luhn-like" checksum. Naming aside, the
 * validator below is the standard formula: it accepts any correctly-issued
 * CNS regardless of which correction path was taken when it was minted, and
 * catches the digit swaps / omissions that typing produces.
 *
 * `computeCnsChecksum` produces a valid 15-digit CNS given an 11-digit
 * prefix — used by seed / synthetic-data scripts. It walks a small ladder
 * of tail patterns (`000X`, `001X`, `010X`, ...) so every prefix has at
 * least one tail that satisfies the invariant.
 */

const CNS_RE = /^\d{15}$/;
const CNS_PREFIX_RE = /^\d{11}$/;

/** Sum of `d[i] * (15 - i)` for every digit in a numeric-only string. */
function weightedSum(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += (digits.charCodeAt(i) - 48) * (15 - i);
  }
  return sum;
}

/**
 * True iff `cns` is a 15-digit string whose weighted checksum matches SUS
 * spec. Rejects wrong length, non-digits, and unknown prefixes.
 */
export function isValidCns(cns: string): boolean {
  if (typeof cns !== "string" || !CNS_RE.test(cns)) return false;
  const first = cns.charCodeAt(0) - 48;
  const known = first === 1 || first === 2 || (first >= 7 && first <= 9);
  if (!known) return false;
  return weightedSum(cns) % 11 === 0;
}

/**
 * Given the first 11 digits of a definitive CNS (prefix `1` or `2`), returns
 * a 4-digit tail such that the full 15-digit CNS validates.
 *
 * Walks a short ladder of tail prefixes (`000`, `001`, `010`, `100`, `011`,
 * `101`, `110`, `111`) so at least one attempt lands on a valid single-digit
 * check character. In practice `000` or `001` covers everything the seed
 * script produces — the ladder exists purely so the helper is total.
 *
 * Throws when the 11-digit input is malformed or (extraordinarily) no tail
 * in the ladder produces a valid checksum, which would indicate a math bug.
 */
export function computeCnsChecksum(prefix11: string): string {
  if (!CNS_PREFIX_RE.test(prefix11)) {
    throw new Error("computeCnsChecksum expects 11 numeric digits.");
  }
  const first = prefix11.charCodeAt(0) - 48;
  if (first !== 1 && first !== 2) {
    throw new Error("computeCnsChecksum is only defined for definitive prefixes (1/2).");
  }

  const s1 = weightedSum(prefix11);
  // Ladder of head-of-tail patterns, ordered by frequency in real corpora.
  const HEADS = ["000", "001", "010", "100", "011", "101", "110", "111"];

  for (const head of HEADS) {
    // Weights for positions 11..13 are 4, 3, 2.
    const headContribution =
      (head.charCodeAt(0) - 48) * 4 +
      (head.charCodeAt(1) - 48) * 3 +
      (head.charCodeAt(2) - 48) * 2;
    const rest = (s1 + headContribution) % 11;
    const dv = rest === 0 ? 0 : 11 - rest;
    if (dv <= 9) {
      const tail = head + dv.toString();
      // Sanity check — cheap, guards against a math regression.
      if (isValidCns(prefix11 + tail)) return tail;
    }
  }
  throw new Error(`computeCnsChecksum: no valid tail found for prefix ${prefix11}`);
}
