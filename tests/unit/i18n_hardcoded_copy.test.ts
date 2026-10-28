import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression guard against hardcoded English UI text.
 *
 * Only files whose copy was extracted into the locale bundles are checked.
 * Attribute literals (`placeholder="..."`, `title="..."`, `aria-label="..."`)
 * must come from `t()`/`tm()` — otherwise RTL users would see English.
 */
const root = resolve(__dirname, "../..");
const scopeFiles = [
  "components/layout/AppHeader.vue",
  "components/layout/AppFooter.vue",
  "components/common/EmptyState.vue",
  "components/common/ErrorState.vue",
  "components/assets/AssetFilter.vue",
  "components/assets/AssetCard.vue",
  "components/assets/AssetCreateModal.vue",
  "components/common/LoadingState.vue",
  "components/ui/Modal.vue",
  "components/admin/FoundationStatus.vue",
  "components/admin/CategoryManager.vue",
  "components/admin/LicenseManager.vue",
  "components/admin/AuditLogViewer.vue",
  "pages/index.vue",
  "pages/assets/[id].vue",
  "pages/tools/image-to-icon.vue",
  "features/image-converter/components/ConverterUploadZone.vue",
  "features/image-converter/components/ConverterPreviewStage.vue",
  "features/image-converter/components/ConverterControlPanel.vue",
  "features/image-converter/components/ConverterExportActions.vue",
  "pages/auth/login.vue",
  "pages/auth/register.vue",
  "pages/admin/index.vue",
  "pages/admin/assets.vue",
  "pages/admin/categories.vue",
  "pages/admin/licenses.vue",
  "pages/admin/audit.vue",
];

/** Literal (non-bound) copy-bearing attributes. */
const literalAttribute =
  /\s(?:placeholder|title|aria-label|alt)="[^"{}]*[A-Za-z]{3,}[^"{}]*"/g;

/** User-visible text nodes containing at least two consecutive ASCII words. */
const literalTextNode = />\s*([A-Z][A-Za-z]*(?:\s+[A-Za-z&'.,-]+){1,})\s*</g;

function stripAllowed(text: string): string {
  return (
    text
      // Interpolations and bindings are already translated.
      .replace(/\{\{[\s\S]*?\}\}/g, "")
      // HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Attribute blocks (checked separately by `literalAttribute`).
      .replace(/<[^>]*>/g, "<>")
  );
}

describe("localization regression guard", () => {
  it.each(scopeFiles)("%s has no hardcoded copy-bearing attributes", (file) => {
    const source = readFileSync(resolve(root, file), "utf8");
    const matches = source.match(literalAttribute) || [];
    expect(matches).toEqual([]);
  });

  it.each(scopeFiles)(
    "%s has no hardcoded sentence-like text nodes",
    (file) => {
      const source = readFileSync(resolve(root, file), "utf8");
      const template = source.split("<template>")[1] || "";
      const stripped = stripAllowed(template);
      const matches = Array.from(stripped.matchAll(literalTextNode)).map(
        (m) => m[1],
      );
      expect(matches).toEqual([]);
    },
  );

  it("ships locale bundles under i18n/locales", () => {
    const files = readdirSync(resolve(root, "i18n/locales")).filter((f) =>
      f.endsWith(".json"),
    );
    expect(files.sort()).toEqual(["ar.json", "en.json"]);
  });

  // Without `file` on each locale the module bundles no messages and every
  // `t()` call renders the raw key in production (build still succeeds).
  it("wires every configured locale to its JSON bundle", () => {
    const config = readFileSync(resolve(root, "nuxt.config.ts"), "utf8");
    for (const code of ["en", "ar"]) {
      expect(config).toMatch(
        new RegExp(`code:\\s*'${code}'[^}]*file:\\s*'${code}\\.json'`),
      );
    }
  });
});
