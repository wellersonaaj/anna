export type ResizedImage = {
  blob: Blob;
  width: number;
  height: number;
  mime: string;
};

type ResizeImageOptions = {
  maxSide?: number;
  quality?: number;
  mime?: "image/jpeg" | "image/webp";
};

export const resizeImageDetailed = async (
  input: Blob,
  { maxSide = 800, quality = 0.85, mime = "image/jpeg" }: ResizeImageOptions = {}
): Promise<ResizedImage> => {
  const bitmap = await createImageBitmap(input);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas não suportado.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Falha ao gerar JPEG."));
        }
      },
      mime,
      quality
    );
  });

  return { blob, width, height, mime };
};

/** Redimensiona para largura máxima e exporta JPEG (PRD: ~800px, qualidade ~85%). */
export const resizeImageToJpeg = async (
  input: Blob,
  maxWidth = 800,
  quality = 0.85
): Promise<Blob> => {
  const resized = await resizeImageDetailed(input, { maxSide: maxWidth, quality, mime: "image/jpeg" });
  return resized.blob;
};
