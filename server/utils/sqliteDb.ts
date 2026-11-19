import { createRequire } from 'node:module'
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import type { Profile, Asset, AssetFile } from '../../types/database'
import type { FontFamily, FontFile } from '../../types/fonts'
import type { Repository, RepositoryItem } from '../../types/repositories'

const require = createRequire(import.meta.url)

class SqlitePersistence {
  private db: DatabaseSyncType | null = null

  private getDb(): DatabaseSyncType {
    if (this.db) return this.db
    const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')

    const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test')
    let dbPath = ':memory:'

    if (!isTest) {
      const preferredDir = process.env.VERCEL
        ? '/tmp/digital-assets-data'
        : path.resolve(process.cwd(), 'data')
      try {
        if (!fs.existsSync(preferredDir)) {
          fs.mkdirSync(preferredDir, { recursive: true })
        }
        dbPath = path.join(preferredDir, 'platform.db')
      } catch {
        dbPath = ':memory:'
      }
    }

    let db: DatabaseSyncType
    try {
      db = new DatabaseSync(dbPath)
      if (dbPath !== ':memory:') {
        try {
          db.exec('PRAGMA journal_mode = WAL;')
        } catch {
          // Ignore WAL pragma errors on restricted filesystems
        }
      }
      db.exec('PRAGMA foreign_keys = OFF;')
      this.initSchema(db)
    } catch {
      db = new DatabaseSync(':memory:')
      db.exec('PRAGMA foreign_keys = OFF;')
      this.initSchema(db)
    }
    this.db = db
    return db
  }

  private initSchema(db: DatabaseSyncType) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        username TEXT UNIQUE,
        display_name TEXT,
        avatar_url TEXT,
        bio TEXT,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'USER',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(lower(username));

      CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        visibility TEXT NOT NULL DEFAULT 'PUBLIC',
        allow_download INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(owner_id, slug)
      );

      CREATE INDEX IF NOT EXISTS idx_repositories_owner ON repositories(owner_id);
      CREATE INDEX IF NOT EXISTS idx_repositories_visibility ON repositories(visibility);

      CREATE TABLE IF NOT EXISTS repository_items (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        item_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(repository_id, item_type, item_id)
      );

      CREATE INDEX IF NOT EXISTS idx_repo_items_repo ON repository_items(repository_id);

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        status TEXT NOT NULL,
        author_id TEXT NOT NULL,
        license_id TEXT,
        category_id TEXT,
        is_featured INTEGER NOT NULL DEFAULT 0,
        download_count INTEGER NOT NULL DEFAULT 0,
        favorite_count INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS asset_files (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        format TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        metadata TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS font_families (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        display_name TEXT,
        description TEXT,
        designer TEXT,
        foundry TEXT,
        primary_category TEXT NOT NULL,
        secondary_categories TEXT,
        arabic_style TEXT,
        language_support TEXT,
        style_tags TEXT,
        recommended_usage TEXT,
        preview_image_path TEXT,
        preview_text_sample TEXT,
        license_type TEXT NOT NULL,
        license_url TEXT,
        license_metadata TEXT,
        publication_status TEXT NOT NULL,
        ai_classification_status TEXT NOT NULL,
        ai_confidence REAL,
        owner_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS font_files (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        file_format TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        sha256_hash TEXT NOT NULL,
        weight INTEGER NOT NULL,
        style TEXT NOT NULL,
        subfamily_name TEXT,
        postscript_name TEXT,
        is_variable INTEGER NOT NULL DEFAULT 0,
        variable_axes TEXT,
        character_count INTEGER,
        unicode_ranges TEXT,
        technical_metadata TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS storage_blobs (
        bucket TEXT NOT NULL,
        path TEXT NOT NULL,
        content BLOB NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        PRIMARY KEY (bucket, path)
      );
    `)

    // Safe additive migrations for existing DB files
    const repoCols = db.prepare(`PRAGMA table_info(repositories)`).all() as Array<{ name: string }>
    if (!repoCols.some(c => c.name === 'allow_download')) {
      db.exec(`ALTER TABLE repositories ADD COLUMN allow_download INTEGER NOT NULL DEFAULT 1;`)
    }
    const fontCols = db.prepare(`PRAGMA table_info(font_families)`).all() as Array<{ name: string }>
    if (!fontCols.some(c => c.name === 'owner_id')) {
      db.exec(`ALTER TABLE font_families ADD COLUMN owner_id TEXT;`)
    }
  }

  public hasPersistedData(): boolean {
    const db = this.getDb()
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM profiles`).get() as { cnt: number }
    return (row?.cnt ?? 0) > 0
  }

  public upsertProfile(p: Profile) {
    const db = this.getDb()
    db.prepare(`
      INSERT INTO profiles (id, email, username, display_name, avatar_url, bio, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        username = excluded.username,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        bio = excluded.bio,
        password_hash = excluded.password_hash,
        role = excluded.role,
        updated_at = excluded.updated_at
    `).run(
      p.id,
      p.email,
      p.username ?? null,
      p.display_name ?? null,
      p.avatar_url ?? null,
      p.bio ?? null,
      p.password_hash ?? null,
      p.role,
      p.created_at,
      p.updated_at
    )
  }

  public deleteProfile(id: string) {
    this.getDb().prepare(`DELETE FROM profiles WHERE id = ?`).run(id)
  }

  public loadProfiles(): Profile[] {
    const rows = this.getDb().prepare(`SELECT * FROM profiles`).all() as any[]
    return rows.map(r => ({
      id: r.id,
      email: r.email,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      bio: r.bio,
      password_hash: r.password_hash,
      role: r.role,
      created_at: r.created_at,
      updated_at: r.updated_at
    }))
  }

  public upsertRepository(r: Repository) {
    this.getDb().prepare(`
      INSERT INTO repositories (id, owner_id, name, slug, description, visibility, allow_download, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner_id = excluded.owner_id,
        name = excluded.name,
        slug = excluded.slug,
        description = excluded.description,
        visibility = excluded.visibility,
        allow_download = excluded.allow_download,
        updated_at = excluded.updated_at
    `).run(
      r.id,
      r.owner_id,
      r.name,
      r.slug,
      r.description ?? null,
      r.visibility,
      r.allow_download === false ? 0 : 1,
      r.created_at,
      r.updated_at
    )
  }

  public deleteRepository(id: string) {
    const db = this.getDb()
    db.prepare(`DELETE FROM repository_items WHERE repository_id = ?`).run(id)
    db.prepare(`DELETE FROM repositories WHERE id = ?`).run(id)
  }

  public loadRepositories(): Repository[] {
    const rows = this.getDb().prepare(`SELECT * FROM repositories`).all() as any[]
    return rows.map(r => ({
      id: r.id,
      owner_id: r.owner_id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      visibility: r.visibility,
      allow_download: r.allow_download !== 0,
      created_at: r.created_at,
      updated_at: r.updated_at
    }))
  }

  public upsertRepositoryItem(ri: RepositoryItem) {
    this.getDb().prepare(`
      INSERT INTO repository_items (id, repository_id, item_type, item_id, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(ri.id, ri.repository_id, ri.item_type, ri.item_id, ri.created_at)
  }

  public deleteRepositoryItem(id: string) {
    this.getDb().prepare(`DELETE FROM repository_items WHERE id = ?`).run(id)
  }

  public loadRepositoryItems(): RepositoryItem[] {
    const rows = this.getDb().prepare(`SELECT * FROM repository_items`).all() as any[]
    return rows.map(r => ({
      id: r.id,
      repository_id: r.repository_id,
      item_type: r.item_type,
      item_id: r.item_id,
      created_at: r.created_at
    }))
  }

  public upsertAsset(a: Asset) {
    this.getDb().prepare(`
      INSERT INTO assets (id, type, name, slug, description, status, author_id, license_id, category_id, is_featured, download_count, favorite_count, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        name = excluded.name,
        slug = excluded.slug,
        description = excluded.description,
        status = excluded.status,
        author_id = excluded.author_id,
        license_id = excluded.license_id,
        category_id = excluded.category_id,
        is_featured = excluded.is_featured,
        download_count = excluded.download_count,
        favorite_count = excluded.favorite_count,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run(
      a.id,
      a.type,
      a.name,
      a.slug,
      a.description ?? null,
      a.status,
      a.author_id,
      a.license_id ?? null,
      a.category_id ?? null,
      a.is_featured ? 1 : 0,
      a.download_count || 0,
      a.favorite_count || 0,
      JSON.stringify(a.metadata || {}),
      a.created_at,
      a.updated_at
    )
  }

  public deleteAsset(id: string) {
    this.getDb().prepare(`DELETE FROM assets WHERE id = ?`).run(id)
  }

  public loadAssets(): Asset[] {
    const rows = this.getDb().prepare(`SELECT * FROM assets`).all() as any[]
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      name: r.name,
      slug: r.slug,
      description: r.description,
      status: r.status,
      author_id: r.author_id,
      license_id: r.license_id,
      category_id: r.category_id,
      is_featured: Boolean(r.is_featured),
      download_count: r.download_count ?? 0,
      favorite_count: r.favorite_count ?? 0,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
      created_at: r.created_at,
      updated_at: r.updated_at
    }))
  }

  public upsertAssetFile(af: AssetFile) {
    this.getDb().prepare(`
      INSERT INTO asset_files (id, asset_id, format, file_path, file_size, mime_type, width, height, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        format = excluded.format,
        file_path = excluded.file_path,
        file_size = excluded.file_size,
        mime_type = excluded.mime_type,
        width = excluded.width,
        height = excluded.height,
        metadata = excluded.metadata
    `).run(
      af.id,
      af.asset_id,
      af.format,
      af.file_path,
      af.file_size,
      af.mime_type,
      af.width ?? null,
      af.height ?? null,
      JSON.stringify(af.metadata || {}),
      af.created_at
    )
  }

  public deleteAssetFile(id: string) {
    this.getDb().prepare(`DELETE FROM asset_files WHERE id = ?`).run(id)
  }

  public loadAssetFiles(): AssetFile[] {
    const rows = this.getDb().prepare(`SELECT * FROM asset_files`).all() as any[]
    return rows.map(r => ({
      id: r.id,
      asset_id: r.asset_id,
      format: r.format,
      file_path: r.file_path,
      file_size: r.file_size,
      mime_type: r.mime_type,
      width: r.width ?? null,
      height: r.height ?? null,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
      created_at: r.created_at
    }))
  }

  public upsertFontFamily(ff: FontFamily) {
    this.getDb().prepare(`
      INSERT INTO font_families (
        id, name, slug, display_name, description, designer, foundry,
        primary_category, secondary_categories, arabic_style, language_support,
        style_tags, recommended_usage, preview_image_path, preview_text_sample,
        license_type, license_url, license_metadata, publication_status,
        ai_classification_status, ai_confidence, owner_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        slug = excluded.slug,
        display_name = excluded.display_name,
        description = excluded.description,
        designer = excluded.designer,
        foundry = excluded.foundry,
        primary_category = excluded.primary_category,
        secondary_categories = excluded.secondary_categories,
        arabic_style = excluded.arabic_style,
        language_support = excluded.language_support,
        style_tags = excluded.style_tags,
        recommended_usage = excluded.recommended_usage,
        preview_image_path = excluded.preview_image_path,
        preview_text_sample = excluded.preview_text_sample,
        license_type = excluded.license_type,
        license_url = excluded.license_url,
        license_metadata = excluded.license_metadata,
        publication_status = excluded.publication_status,
        ai_classification_status = excluded.ai_classification_status,
        ai_confidence = excluded.ai_confidence,
        owner_id = excluded.owner_id,
        updated_at = excluded.updated_at
    `).run(
      ff.id,
      ff.name,
      ff.slug,
      ff.display_name || ff.name,
      ff.description ?? null,
      ff.designer ?? null,
      ff.foundry ?? null,
      ff.primary_category,
      JSON.stringify(ff.secondary_categories || []),
      ff.arabic_style ?? null,
      JSON.stringify(ff.language_support || []),
      JSON.stringify(ff.style_tags || []),
      JSON.stringify(ff.recommended_usage || []),
      ff.preview_image_path ?? null,
      ff.preview_text_sample ?? null,
      ff.license_type,
      ff.license_url ?? null,
      ff.license_metadata ? JSON.stringify(ff.license_metadata) : null,
      ff.publication_status,
      ff.ai_classification_status,
      ff.ai_confidence ?? null,
      (ff as any).owner_id ?? null,
      ff.created_at,
      ff.updated_at
    )
  }

  public deleteFontFamily(id: string) {
    this.getDb().prepare(`DELETE FROM font_families WHERE id = ?`).run(id)
  }

  public loadFontFamilies(): FontFamily[] {
    const rows = this.getDb().prepare(`SELECT * FROM font_families`).all() as any[]
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      display_name: r.display_name || r.name,
      description: r.description ?? undefined,
      designer: r.designer ?? undefined,
      foundry: r.foundry ?? undefined,
      primary_category: r.primary_category,
      secondary_categories: r.secondary_categories ? JSON.parse(r.secondary_categories) : [],
      arabic_style: r.arabic_style ?? undefined,
      language_support: r.language_support ? JSON.parse(r.language_support) : [],
      style_tags: r.style_tags ? JSON.parse(r.style_tags) : [],
      recommended_usage: r.recommended_usage ? JSON.parse(r.recommended_usage) : [],
      preview_image_path: r.preview_image_path ?? undefined,
      preview_text_sample: r.preview_text_sample ?? undefined,
      license_type: r.license_type,
      license_url: r.license_url ?? undefined,
      license_metadata: r.license_metadata ? JSON.parse(r.license_metadata) : undefined,
      publication_status: r.publication_status,
      ai_classification_status: r.ai_classification_status,
      ai_confidence: r.ai_confidence ?? undefined,
      owner_id: r.owner_id ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at
    } as FontFamily))
  }

  public upsertFontFile(ff: FontFile) {
    this.getDb().prepare(`
      INSERT INTO font_files (
        id, family_id, file_name, storage_path, file_format, file_size, sha256_hash,
        weight, style, subfamily_name, postscript_name, is_variable, variable_axes,
        character_count, unicode_ranges, technical_metadata, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        file_name = excluded.file_name,
        storage_path = excluded.storage_path,
        file_format = excluded.file_format,
        file_size = excluded.file_size,
        sha256_hash = excluded.sha256_hash,
        weight = excluded.weight,
        style = excluded.style,
        subfamily_name = excluded.subfamily_name,
        postscript_name = excluded.postscript_name,
        is_variable = excluded.is_variable,
        variable_axes = excluded.variable_axes,
        character_count = excluded.character_count,
        unicode_ranges = excluded.unicode_ranges,
        technical_metadata = excluded.technical_metadata
    `).run(
      ff.id,
      ff.family_id,
      ff.file_name,
      ff.storage_path,
      ff.file_format,
      ff.file_size,
      ff.sha256_hash,
      ff.weight,
      ff.style,
      ff.subfamily_name ?? null,
      ff.postscript_name ?? null,
      ff.is_variable ? 1 : 0,
      ff.variable_axes ? JSON.stringify(ff.variable_axes) : null,
      ff.character_count ?? null,
      ff.unicode_ranges ? JSON.stringify(ff.unicode_ranges) : null,
      ff.technical_metadata ? JSON.stringify(ff.technical_metadata) : null,
      ff.created_at
    )
  }

  public deleteFontFile(id: string) {
    this.getDb().prepare(`DELETE FROM font_files WHERE id = ?`).run(id)
  }

  public loadFontFiles(): FontFile[] {
    const rows = this.getDb().prepare(`SELECT * FROM font_files`).all() as any[]
    return rows.map(r => ({
      id: r.id,
      family_id: r.family_id,
      file_name: r.file_name,
      storage_path: r.storage_path,
      file_format: r.file_format,
      file_size: r.file_size,
      sha256_hash: r.sha256_hash,
      weight: r.weight,
      style: r.style,
      subfamily_name: r.subfamily_name ?? undefined,
      postscript_name: r.postscript_name ?? undefined,
      is_variable: Boolean(r.is_variable),
      variable_axes: r.variable_axes ? JSON.parse(r.variable_axes) : undefined,
      character_count: r.character_count ?? undefined,
      unicode_ranges: r.unicode_ranges ? JSON.parse(r.unicode_ranges) : undefined,
      technical_metadata: r.technical_metadata ? JSON.parse(r.technical_metadata) : undefined,
      created_at: r.created_at
    }))
  }

  public upsertStorageBlob(bucket: string, blobPath: string, content: Buffer | string, mimeType: string, size: number) {
    const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content
    this.getDb().prepare(`
      INSERT INTO storage_blobs (bucket, path, content, mime_type, size)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(bucket, path) DO UPDATE SET
        content = excluded.content,
        mime_type = excluded.mime_type,
        size = excluded.size
    `).run(bucket, blobPath, buf, mimeType, size)
  }

  public deleteStorageBlob(bucket: string, blobPath: string) {
    this.getDb().prepare(`DELETE FROM storage_blobs WHERE bucket = ? AND path = ?`).run(bucket, blobPath)
  }

  public loadStorageBlobs(): Array<{ bucket: string; path: string; buffer: Buffer; mimeType: string; size: number }> {
    const rows = this.getDb().prepare(`SELECT * FROM storage_blobs`).all() as any[]
    return rows.map(r => ({
      bucket: r.bucket,
      path: r.path,
      buffer: Buffer.from(r.content),
      mimeType: r.mime_type,
      size: r.size
    }))
  }
}

export const sqliteDb = new SqlitePersistence()
