import { describe, it, expect } from "vitest";
import { resolveLayerId } from "@/lib/sheets/pipeline";

describe("sheets/pipeline", () => {
  describe("resolveLayerId", () => {
    it("maps Portuguese tab names to LayerIds (case-insensitive)", () => {
      expect(resolveLayerId("Gestantes")).toBe("gestantes");
      expect(resolveLayerId("gestantes")).toBe("gestantes");
      expect(resolveLayerId("Tuberculose")).toBe("tuberculose");
      expect(resolveLayerId("DM (Diabetes)")).toBe("diabetes");
      expect(resolveLayerId("dm (diabetes)")).toBe("diabetes");
      expect(resolveLayerId("HAS (Hipertensão)")).toBe("hipertensao");
      expect(resolveLayerId("Domiciliados Acamados")).toBe("acamados");
      expect(resolveLayerId("PSE (Saúde na Escola)")).toBe("pse");
      expect(resolveLayerId("ILPI")).toBe("ilpi");
    });

    it("returns null for unknown tab names", () => {
      expect(resolveLayerId("Unknown Tab")).toBeNull();
      expect(resolveLayerId("_config")).toBeNull();
      expect(resolveLayerId("")).toBeNull();
    });
  });
});
