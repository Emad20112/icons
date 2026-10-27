import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const localeDir = resolve(__dirname, '../../i18n/locales')

function loadLocale(code: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(localeDir, `${code}.json`), 'utf8'))
}

type Lookup = (path: string) => unknown

/** Flatten a nested locale object into dot-separated key paths. */
function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

/** Read a value at a dot path. */
function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object")
      return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

const en = loadLocale("en");
const ar = loadLocale("ar");
const enKeys = flattenKeys(en);
const arKeys = flattenKeys(ar);

describe("i18n locale bundles", () => {
  it("loads both locale files as JSON objects", () => {
    expect(Object.keys(en).length).toBeGreaterThan(0);
    expect(Object.keys(ar).length).toBeGreaterThan(0);
  });

  it("has the exact same key set in en.json and ar.json (recursive diff = 0)", () => {
    const missingInAr = enKeys.filter((k) => !arKeys.includes(k)).sort();
    const missingInEn = arKeys.filter((k) => !enKeys.includes(k)).sort();

    expect(missingInAr).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(arKeys.sort()).toEqual(enKeys.sort());
  });

  it("contains no empty or whitespace-only string values", () => {
    const lookup: Record<string, Record<string, unknown>> = { en, ar };
    const offenders: string[] = [];

    for (const [code, bundle] of Object.entries(lookup)) {
      for (const key of flattenKeys(bundle)) {
        const value = getAtPath(bundle, key);
        if (typeof value !== "string" || value.trim() === "") {
          offenders.push(`${code}:${key}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps interpolation placeholders identical across locales", () => {
    const placeholders = (value: unknown): string[] =>
      (String(value).match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();

    for (const key of enKeys) {
      expect(placeholders(getAtPath(ar, key))).toEqual(
        placeholders(getAtPath(en, key)),
      );
    }
  });
});

;
