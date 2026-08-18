/**
 * ViaCEP client — Brazilian postal-code lookup.
 *
 * ViaCEP is a public, CORS-permissive service the Brazilian public sector
 * consumes universally. Direct client fetch is fine; no server proxy needed.
 *
 * Endpoint: https://viacep.com.br/ws/{cep8}/json/
 * Response on success: { cep, logradouro, complemento, bairro, localidade,
 *                        uf, ibge, gia, ddd, siafi }
 * Response on invalid CEP: { erro: true } (still 200)
 * Response on malformed CEP: 400
 *
 * We only surface `logradouro` and `bairro` because localidade is always
 * "Porto Alegre" for the pilot and complemento is user-authored anyway.
 */

export type ViaCepResult = {
  logradouro: string;
  bairro: string;
}

/**
 * Look up a CEP via ViaCEP.
 *
 * Accepts 8-digit or hyphenated (NNNNN-NNN) input. Returns null when the
 * CEP is malformed, not found, or the network call failed. Callers should
 * treat null as "user needs to fill address manually" — never surface the
 * distinction between "not found" and "network down" (adds noise; the fix
 * is the same either way: type it in).
 */
export async function lookupCep(input: string): Promise<ViaCepResult | null> {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      // No cache: the ViaCEP dataset changes rarely but browser caching is
      // safe here. Left as default; hits our disk cache on repeat lookups.
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<ViaCepResult> & { erro?: boolean };
    if (body.erro) return null;
    return {
      logradouro: body.logradouro ?? "",
      bairro: body.bairro ?? "",
    };
  } catch {
    return null;
  }
}
