import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LOCALES,
  SUPPORTED_LOCALE_CODES,
  DEFAULT_LOCALE,
  getDirection,
  getOgLocale,
} from "../../i18n/locales";

describe("i18n RTL direction rules", () => {
  it("supports exactly English (ltr) and Arabic (rtl)", () => {
    expect(SUPPORTED_LOCALE_CODES.sort()).toEqual(["ar", "en"]);
    expect(SUPPORTED_LOCALES.map((l) => l.dir).sort()).toEqual(["ltr", "rtl"]);
  });

  it("maps ar ⇒ rtl and en ⇒ ltr", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
  });

  it("falls back to ltr for unknown locale codes", () => {
    expect(getDirection("fr")).toBe("ltr");
    expect(getDirection("")).toBe("ltr");
  });

  it("defaults to English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("exposes a valid og:locale per locale", () => {
    expect(getOgLocale("en")).toBe("en_US");
    expect(getOgLocale("ar")).toBe("ar_SA");
    for (const locale of SUPPORTED_LOCALES) {
      expect(locale.language).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(locale.name.trim().length).toBeGreaterThan(0);
    }
  });
});
