/**
 * Production-grade filename sanitizer to prevent Path Traversal, Null Byte Injection,
 * and dangerous file execution.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_asset'
  }

  // 1. Remove null bytes
  let safe = filename.replace(/\0/g, '')

  // 2. Remove directory traversal sequences (../ or ..\)
  safe = safe.replace(/\.\.+[/\\]/g, '')

  // 3. Keep only alphanumeric characters, dashes, underscores, and dots
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_')

  // 4. Ensure it doesn't begin with a dot or dash
  safe = safe.replace(/^[.-]+/, '')

  // 5. Limit length to 100 characters while preserving extension
  if (safe.length > 100) {
    const parts = safe.split('.')
    if (parts.length > 1) {
      const ext = parts.pop()!
      safe = parts.join('_').slice(0, 95 - ext.length) + '.' + ext
    } else {
      safe = safe.slice(0, 100)
    }
  }

  return safe.toLowerCase() || 'asset'
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}
