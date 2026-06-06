import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = express.Router();

const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis').max(100),
  lastName: z.string().trim().min(1, 'Nom requis').max(100),
  email: z.string().trim().email('Email invalide').max(255).transform((val) => val.toLowerCase()),
  subject: z.string().trim().min(1, 'Sujet requis').max(200),
  orderId: z.string().trim().max(100).optional().nullable(),
  message: z.string().trim().min(10, 'Message trop court (10 caractères min)').max(5000),
});

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit a contact support message
 *     tags: [Contact]
 */
router.post('/', validate({ body: contactSchema }), async (req, res) => {
  try {
    const { firstName, lastName, email, subject, orderId, message } = req.body;

    const contactMsg = await prisma.contactMessage.create({
      data: {
        firstName,
        lastName,
        email,
        subject,
        orderId: orderId || null,
        message,
      },
    });

    return res.status(201).json({
      message: 'Votre message a été envoyé avec succès.',
      id: contactMsg.id,
    });
  } catch (error) {
    console.error('Contact submission error:', error);
    return res.status(500).json({ message: "Impossible d'envoyer votre message pour le moment." });
  }
});

/**
 * @swagger
 * /api/admin/messages:
 *   get:
 *     summary: Retrieve support contact messages
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/messages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json(messages);
  } catch (error) {
    console.error('Fetch contact messages error:', error);
    return res.status(500).json({ message: 'Impossible de récupérer les messages pour le moment.' });
  }
});

export default router;
