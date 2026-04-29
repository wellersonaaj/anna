import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

export type StorageEnv = {
  STORAGE_ENDPOINT?: string | undefined;
  STORAGE_ACCESS_KEY?: string | undefined;
  STORAGE_SECRET_KEY?: string | undefined;
  STORAGE_BUCKET?: string | undefined;
  STORAGE_REGION?: string | undefined;
  STORAGE_PUBLIC_BASE_URL?: string | undefined;
};

export const isStorageConfigured = (e: StorageEnv): boolean => {
  return Boolean(
    e.STORAGE_ENDPOINT?.trim() &&
      e.STORAGE_ACCESS_KEY?.trim() &&
      e.STORAGE_SECRET_KEY?.trim() &&
      e.STORAGE_BUCKET?.trim()
  );
};

const s3Client = (e: StorageEnv): S3Client => {
  return new S3Client({
    region: e.STORAGE_REGION?.trim() || "us-east-1",
    endpoint: e.STORAGE_ENDPOINT!.trim(),
    credentials: {
      accessKeyId: e.STORAGE_ACCESS_KEY!.trim(),
      secretAccessKey: e.STORAGE_SECRET_KEY!.trim()
    },
    forcePathStyle: true
  });
};

export const buildPublicObjectUrl = (e: StorageEnv, key: string): string => {
  const base = e.STORAGE_PUBLIC_BASE_URL?.trim();
  if (base) {
    return `${base.replace(/\/$/, "")}/${key}`;
  }
  const endpoint = e.STORAGE_ENDPOINT!.replace(/\/$/, "");
  const bucket = e.STORAGE_BUCKET!;
  return `${endpoint}/${bucket}/${key}`;
};

export const createPresignedPut = async (
  e: StorageEnv,
  params: {
    key: string;
    contentType: string;
    expiresSeconds?: number;
  }
): Promise<{ uploadUrl: string; publicUrl: string }> => {
  if (!isStorageConfigured(e)) {
    throw new Error("Storage is not configured.");
  }

  const client = s3Client(e);
  const command = new PutObjectCommand({
    Bucket: e.STORAGE_BUCKET!.trim(),
    Key: params.key,
    ContentType: params.contentType
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: params.expiresSeconds ?? 300
  });

  return {
    uploadUrl,
    publicUrl: buildPublicObjectUrl(e, params.key)
  };
};

export const createPresignedGet = async (
  e: StorageEnv,
  params: {
    key: string;
    expiresSeconds?: number;
  }
): Promise<string> => {
  if (!isStorageConfigured(e)) {
    throw new Error("Storage is not configured.");
  }

  const client = s3Client(e);
  const command = new GetObjectCommand({
    Bucket: e.STORAGE_BUCKET!.trim(),
    Key: params.key
  });

  return getSignedUrl(client, command, {
    expiresIn: params.expiresSeconds ?? 3600
  });
};

export const buildUploadKey = (parts: {
  brechoId: string;
  pecaId: string;
  loteId: string;
  extensao: string;
}): string => {
  const ext = parts.extensao.replace(/^\./, "").toLowerCase();
  return `${parts.brechoId}/${parts.pecaId}/${parts.loteId}/${randomUUID()}.${ext}`;
};

/** If `imageUrl` was produced by this app for the configured bucket, return the S3 object key (for private buckets). */
export const resolveObjectKeyFromPublicUrl = (e: StorageEnv, imageUrl: string): string | null => {
  if (!isStorageConfigured(e)) {
    return null;
  }
  const u = imageUrl.trim();
  const base = e.STORAGE_PUBLIC_BASE_URL?.trim();
  if (base) {
    const normalizedBase = base.replace(/\/$/, "");
    if (u.startsWith(normalizedBase)) {
      const rest = u.slice(normalizedBase.length).replace(/^\//, "");
      return rest.length > 0 ? rest : null;
    }
  }
  const endpoint = e.STORAGE_ENDPOINT!.replace(/\/$/, "");
  const bucket = e.STORAGE_BUCKET!.trim();
  const prefix = `${endpoint}/${bucket}/`;
  if (u.startsWith(prefix)) {
    const rest = u.slice(prefix.length);
    return rest.length > 0 ? rest : null;
  }
  return null;
};

/**
 * Load image bytes for server-side AI. Uses authenticated S3 GetObject when the URL matches this storage config;
 * otherwise falls back to HTTP fetch (public URL or CDN).
 */
export const downloadImageForAnalysis = async (
  e: StorageEnv,
  imageUrl: string
): Promise<{ bytes: Uint8Array; mime: string }> => {
  const key = resolveObjectKeyFromPublicUrl(e, imageUrl);
  if (key && isStorageConfigured(e)) {
    const client = s3Client(e);
    const out = await client.send(
      new GetObjectCommand({
        Bucket: e.STORAGE_BUCKET!.trim(),
        Key: key
      })
    );
    if (!out.Body) {
      throw new Error("Empty S3 object body.");
    }
    const bytes = await out.Body.transformToByteArray();
    const mime = out.ContentType?.split(";")[0]?.trim() || "image/jpeg";
    return { bytes, mime };
  }

  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error("Failed to download image for analysis.");
  }
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  return { bytes: buf, mime };
};
