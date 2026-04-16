import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

export const buildUploadKey = (parts: {
  brechoId: string;
  pecaId: string;
  loteId: string;
  extensao: string;
}): string => {
  const ext = parts.extensao.replace(/^\./, "").toLowerCase();
  return `${parts.brechoId}/${parts.pecaId}/${parts.loteId}/${randomUUID()}.${ext}`;
};
