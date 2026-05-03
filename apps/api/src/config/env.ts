import { z } from "zod";
import type { StorageEnv } from "../lib/storage.js";

const trimOrUndef = (s: string | undefined): string | undefined => {
  const t = s?.trim();
  return t || undefined;
};

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  /** Railway, Render, Fly, etc. expõem a porta via PORT. */
  PORT: z.coerce.number().optional(),
  API_PORT: z.coerce.number().default(3333),
  API_HOST: z.string().default("0.0.0.0"),
  /** S3-compatible (MinIO, AWS, etc.). Opcional: presign falha com mensagem clara se incompleto. */
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  /** URL base publica para leitura das imagens (ex. CDN ou bucket publico). Se vazio, usa path-style endpoint/bucket/key. */
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),
  /** Aliases comuns (ex. Railway/AWS): usados se STORAGE_* nao estiver definido. */
  AWS_ENDPOINT_URL: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_DEFAULT_REGION: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  /** Base publica opcional (CDN); alias de STORAGE_PUBLIC_BASE_URL. */
  AWS_S3_PUBLIC_BASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  FOUNDER_BOOTSTRAP_PHONE: z.string().optional(),
  FOUNDER_BOOTSTRAP_PASSWORD: z.string().optional(),
  /** Se `true` / `1` / `yes`, a API não aplica bootstrap de fundador no arranque (útil se só usar `seed:founder`). */
  FOUNDER_BOOTSTRAP_DISABLE_ON_START: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  /** Modelo com visão para análise de fotos de peça (ex.: gpt-4o-mini). */
  OPENAI_VISION_MODEL: z.string().optional()
});

export const env = envSchema.parse(process.env);

/** Credenciais S3 unificadas: `STORAGE_*` tem prioridade; senao usa `AWS_*` (padrao de muitos paineis). */
export const storageEnv: StorageEnv = {
  STORAGE_ENDPOINT: trimOrUndef(env.STORAGE_ENDPOINT) ?? trimOrUndef(env.AWS_ENDPOINT_URL),
  STORAGE_ACCESS_KEY: trimOrUndef(env.STORAGE_ACCESS_KEY) ?? trimOrUndef(env.AWS_ACCESS_KEY_ID),
  STORAGE_SECRET_KEY: trimOrUndef(env.STORAGE_SECRET_KEY) ?? trimOrUndef(env.AWS_SECRET_ACCESS_KEY),
  STORAGE_BUCKET: trimOrUndef(env.STORAGE_BUCKET) ?? trimOrUndef(env.AWS_S3_BUCKET_NAME),
  STORAGE_REGION:
    trimOrUndef(env.STORAGE_REGION) ??
    trimOrUndef(env.AWS_DEFAULT_REGION) ??
    trimOrUndef(env.AWS_REGION),
  STORAGE_PUBLIC_BASE_URL:
    trimOrUndef(env.STORAGE_PUBLIC_BASE_URL) ?? trimOrUndef(env.AWS_S3_PUBLIC_BASE_URL)
};
