// src/utils/imageCompressor.js

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 Mo

// Redimensionne et recompresse une image côté client (canvas) avant upload,
// pour éviter que des photos de téléphone non compressées (plusieurs Mo)
// remplissent le quota de storage Supabase.
export async function compressImage(file, maxDimension = 512, quality = 0.8) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("L'image dépasse la taille maximale de 5 Mo.");
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("La compression de l'image a échoué.")),
      'image/jpeg',
      quality
    );
  });
}
