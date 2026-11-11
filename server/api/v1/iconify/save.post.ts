import { defineEventHandler, readBody, createError } from "h3";
import { getAuthContext } from "../../../utils/supabaseClient";
import { AssetService } from "../../../services/assetService";
import { RepositoryService } from "../../../services/repositoryService";
import { storageService } from "../../../services/storageService";
import { dbStore } from "../../../utils/mockStore";

interface SaveIconBody {
  prefix: string;
  name: string;
  svg: string;
  repositoryId?: string;
}

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event);
  if (!auth.userId || !auth.role) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }

  const body = await readBody<SaveIconBody>(event);
  if (!body?.prefix || !body?.name || !body?.svg) {
    throw createError({
      statusCode: 400,
      statusMessage: "prefix, name, and svg are required",
    });
  }

  // 1. Sanitize SVG and create Asset record
  const cleanPrefix = String(body.prefix).trim().toLowerCase();
  const cleanName = String(body.name).trim().toLowerCase();
  const assetName = `${cleanPrefix}:${cleanName}`;

  // Pick default MIT license if available, or first available license
  const defaultLicense =
    Array.from(dbStore.licenses.values()).find((l) => l.slug === "mit") ||
    Array.from(dbStore.licenses.values())[0];

  const newAsset = await AssetService.createAsset(
    {
      name: assetName,
      type: "ICON",
      description: `Imported icon ${assetName} from Iconify API`,
      status: "DRAFT",
      license_id: defaultLicense?.id || null,
      metadata: {
        source: "iconify",
        prefix: cleanPrefix,
        name: cleanName,
        imported_at: new Date().toISOString(),
      },
    },
    auth.userId,
    auth.role,
  );

  // 2. Upload SVG to storage bucket and attach file
  const fileName = `${cleanPrefix}-${cleanName}.svg`;
  const cleanFileName = storageService.sanitizeFilename(fileName);
  const filePath = `assets/files/${newAsset.id}/svg/${cleanFileName}`;

  const uploadResult = await storageService.uploadFile({
    bucket: "assets",
    path: filePath,
    file: body.svg,
    mimeType: "image/svg+xml",
  });

  await AssetService.attachFile(
    {
      asset_id: newAsset.id,
      format: "SVG",
      file_path: uploadResult.path,
      file_size: uploadResult.size,
      mime_type: "image/svg+xml",
      width: 24,
      height: 24,
      metadata: { fullUrl: uploadResult.fullUrl },
    },
    auth.userId,
    auth.role,
  );

  // 3. Optional: Add to user's repository if requested
  let repositoryItem = null;
  if (body.repositoryId) {
    repositoryItem = await RepositoryService.addItemToRepository(
      body.repositoryId,
      "ASSET",
      newAsset.id,
      auth.userId,
      auth.role,
    );
  }

  return {
    success: true,
    data: {
      asset: newAsset,
      repositoryItem,
    },
  };
});
