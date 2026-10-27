/**
 * Lê a imagem escolhida pelo usuário e a devolve como data URL WebP,
 * reduzida para caber no Storage sem pesar no upload.
 */
export async function fileToScreenshotDataUrl(file: File): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  if (!file.type.startsWith('image/')) return dataUrl;

  try {
    return await compress(dataUrl);
  } catch {
    return dataUrl;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

async function compress(dataUrl: string, maxSize = 1280, quality = 0.72): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;

  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  // Preferência por WebP; cai para JPEG se o navegador não suportar.
  const webp = canvas.toDataURL('image/webp', 0.8);
  const encoded = webp.startsWith('data:image/webp')
    ? webp
    : canvas.toDataURL('image/jpeg', quality);
  return encoded.length < dataUrl.length ? encoded : dataUrl;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Imagem inválida.'));
    image.src = src;
  });
}
