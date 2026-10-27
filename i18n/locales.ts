/**
 * Supported locale registry — single source of truth for i18n tests and
 * any non-component code that needs to know about locales.
 *
 * Keep in sync with the `locales` array in `nuxt.config.ts`.
 * (Type-only module: importable from Nuxt and from plain Vitest tests.)
 */
export interface SupportedLocale {
  code: "en" | "ar";
  language: string;
  name: string;
  dir: "ltr" | "rtl";
}

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: "en", language: "en-US", name: "English", dir: "ltr" },
  { code: "ar", language: "ar-SA", name: "العربية", dir: "rtl" },
];

export const DEFAULT_LOCALE: SupportedLocale["code"] = "en";

export const SUPPORTED_LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code);

/** Text direction for a locale code (`en` ⇒ `ltr`, `ar` ⇒ `rtl`). */
export function getDirection(code: string): "ltr" | "rtl" {
  const match = SUPPORTED_LOCALES.find((l) => l.code === code);
  return match ? match.dir : "ltr";
}

/** `og:locale` value for a locale code (`ar` ⇒ `ar_SA`). */
export function getOgLocale(code: string): string {
  const match = SUPPORTED_LOCALES.find((l) => l.code === code);
  return (match?.language || "en-US").replace("-", "_");
}
