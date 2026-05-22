import multer from 'multer';
import path from 'path';
import fs from 'fs';

// S'assurer que le dossier public/uploads existe
const uploadDir = './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration du stockage de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nettoyer le nom de fichier et ajouter un timestamp unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// Filtre pour les types de fichiers (images uniquement)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Erreur : Seules les images sont autorisées (jpeg, jpg, png, gif, webp).'));
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de taille : 5 Mo
  fileFilter: fileFilter
});
