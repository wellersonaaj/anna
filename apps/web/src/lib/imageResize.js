/** Redimensiona para largura máxima e exporta JPEG (PRD: ~800px, qualidade ~85%). */
export const resizeImageToJpeg = async (input, maxWidth = 800, quality = 0.85) => {
    const bitmap = await createImageBitmap(input);
    const scale = Math.min(1, maxWidth / bitmap.width);
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
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            }
            else {
                reject(new Error("Falha ao gerar JPEG."));
            }
        }, "image/jpeg", quality);
    });
};
