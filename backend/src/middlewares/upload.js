import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { supabase, STORAGE_BUCKET } from '../lib/supabase.js';

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetypeAllowed = allowedTypes.test(file.mimetype);
  const extensionAllowed = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (!mimetypeAllowed || !extensionAllowed) {
    return cb(new Error('Only jpeg, jpg, png, gif, and webp images are allowed.'));
  }

  cb(null, true);
};

// Upload mémoire vive — le buffer sera envoyé directement à Supabase Storage
// Supporte un fichier unique (legacy) ou plusieurs fichiers (multi-images produit)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max par fichier
    files: 10,                  // 10 images max par produit
  },
  fileFilter,
});

/**
 * Upload un fichier image vers Supabase Storage.
 * @param {Express.Multer.File} file - Le fichier reçu par multer (req.file ou req.files[i])
 * @returns {Promise<string>} URL publique de l'image dans Supabase Storage
 */
export async function uploadImageToSupabase(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = path
    .basename(file.originalname, ext)
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .slice(0, 60);

  const fileName = `${baseName || 'upload'}-${crypto.randomUUID()}${ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

/**
 * Upload plusieurs fichiers images vers Supabase Storage.
 * @param {Express.Multer.File[]} files - Tableau de fichiers multer
 * @returns {Promise<string[]>} URLs publiques des images uploadées
 */
export async function uploadImagesToSupabase(files) {
  if (!files || files.length === 0) return [];
  return Promise.all(files.map(uploadImageToSupabase));
}

/**
 * Supprime une image de Supabase Storage à partir de son URL publique.
 * Ne lance pas d'erreur si l'image n'existe pas ou si l'URL n'est pas valide.
 * @param {string} imageUrl - URL publique Supabase Storage de l'image à supprimer
 */
export async function deleteImageFromSupabase(imageUrl) {
  if (!imageUrl || !imageUrl.includes(STORAGE_BUCKET)) return;

  try {
    const url = new URL(imageUrl);
    // Extraire le chemin du fichier après "/object/public/<bucket>/"
    const marker = `/object/public/${STORAGE_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return;

    const filePath = url.pathname.slice(markerIndex + marker.length);
    if (!filePath) return;

    await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
  } catch {
    // Silencieux : on ne bloque pas l'opération principale si la suppression échoue
  }
}

/**
 * Supprime plusieurs images de Supabase Storage.
 * @param {string[]} imageUrls - Tableau d'URLs publiques à supprimer
 */
export async function deleteImagesFromSupabase(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return;
  await Promise.all(imageUrls.map(deleteImageFromSupabase));
}
