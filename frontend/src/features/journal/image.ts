/**
 * Lê a imagem escolhida pelo usuário e a devolve como data URL JPEG,
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

  const jpeg = canvas.toDataURL('image/jpeg', quality);
  return jpeg.length < dataUrl.length ? jpeg : dataUrl;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Imagem inválida.'));
    image.src = src;
  });
}
