import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

describe.each(["sync", "async"])("Zod constrained collection security regression (%s)", (mode) => {
  // GHSA-mrhx-c7xc-m3w5: exercise the early bound without allocating a large input.
  it.each(["max", "length"] as const)(
    "checks array %s before parsing oversized input elements",
    async (bound) => {
      const parseElement = vi.fn((value: unknown) => value);
      const schema = z.array(z.preprocess(parseElement, z.number()))[bound](2);

      const result =
        mode === "async"
          ? await schema.safeParseAsync(["a", "b", "c"])
          : schema.safeParse(["a", "b", "c"]);

      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({ code: "too_big", maximum: 2, path: [] }),
      ]);
      expect(parseElement).not.toHaveBeenCalled();
      const valid = mode === "async" ? await schema.parseAsync([1, 2]) : schema.parse([1, 2]);
      expect(valid).toEqual([1, 2]);
      expect(parseElement).toHaveBeenCalledTimes(2);
    },
  );

  it("checks set max before parsing oversized input elements", async () => {
    const parseElement = vi.fn((value: unknown) => value);
    const schema = z.set(z.preprocess(parseElement, z.number())).max(2);

    const result =
      mode === "async"
        ? await schema.safeParseAsync(new Set(["a", "b", "c"]))
        : schema.safeParse(new Set(["a", "b", "c"]));

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ code: "too_big", maximum: 2, path: [] }),
    ]);
    expect(parseElement).not.toHaveBeenCalled();
    const valid =
      mode === "async" ? await schema.parseAsync(new Set([1, 2])) : schema.parse(new Set([1, 2]));
    expect(valid).toEqual(new Set([1, 2]));
    expect(parseElement).toHaveBeenCalledTimes(2);
  });
});
