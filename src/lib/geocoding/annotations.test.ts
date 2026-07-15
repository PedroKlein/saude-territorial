import { describe, it, expect } from "vitest";
import { getAnnotations, addAnnotation } from "./annotations";

describe("annotations", () => {
  it("getAnnotations returns an array", async () => {
    const result = await getAnnotations();
    expect(Array.isArray(result)).toBe(true);
  });

  it("addAnnotation does not throw", async () => {
    await expect(
      addAnnotation("Rua Oficial", "Rua Popular", "Próximo ao mercado")
    ).resolves.not.toThrow();
  });
});
