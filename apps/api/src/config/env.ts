import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
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
  OPENAI_API_KEY: z.string().optional(),
  /** Modelo com visão para análise de fotos de peça (ex.: gpt-4o-mini). */
  OPENAI_VISION_MODEL: z.string().optional()
});

export const env = envSchema.parse(process.env);
