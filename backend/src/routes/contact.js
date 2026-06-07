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

const messagesQuerySchema = z.object({
  isRead: z.enum(['true', 'false', 'all']).optional().default('all'),
  page:   z.coerce.number().int().min(1).optional().default(1),
  limit:  z.coerce.number().int().min(1).max(100).optional().default(50),
});

const messageIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit a contact support message
 *     description: Allows any visitor to submit a support or inquiry message.
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactMessageRequest'
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 *     summary: Retrieve support contact messages (admin)
 *     description: Returns all contact messages, optionally filtered by read status. Includes unread count.
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema: { type: string, enum: [all, true, false] }
 *         description: Filter by read status
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated message list with unread count
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/admin/messages', authenticateToken, requireAdmin, validate({ query: messagesQuerySchema }), async (req, res) => {
  try {
    const { isRead, page, limit } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (isRead !== 'all') {
      where.isRead = isRead === 'true';
    }

    const [messages, total, unreadCount] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.count({ where: { isRead: false } }),
    ]);

    return res.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    });
  } catch (error) {
    console.error('Fetch contact messages error:', error);
    return res.status(500).json({ message: 'Impossible de récupérer les messages pour le moment.' });
  }
});

/**
 * @swagger
 * /api/admin/messages/{id}/read:
 *   put:
 *     summary: Mark a contact message as read
 *     description: Sets isRead = true for the specified message.
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Message marked as read
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put('/admin/messages/:id/read', authenticateToken, requireAdmin, validate({ params: messageIdSchema }), async (req, res) => {
  try {
    const msg = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!msg) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    const updated = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    return res.json({ message: 'Message marked as read.', contactMessage: updated });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ message: 'Unable to update message.' });
  }
});

export default router;
