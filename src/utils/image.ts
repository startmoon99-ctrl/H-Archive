import { IMAGE_UPLOAD } from '@/config/app';

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없습니다.'));
    };
    image.src = url;
  });
}

/** localStorage 용량을 아끼기 위해 업로드 이미지를 축소한 data URL로 변환한다 */
export async function fileToDataUrl(file: File): Promise<string> {
  const image = await loadImage(file);
  const { maxDimension, quality, mimeType } = IMAGE_UPLOAD;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이미지를 처리할 수 없습니다.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mimeType, quality);
}
