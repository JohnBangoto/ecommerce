import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'luxora_super_secret_key_2026';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé, jeton manquant.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Jeton invalide ou expiré.' });
    }
    req.user = decoded;
    next();
  });
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé, droits administrateur requis.' });
  }
  next();
};
