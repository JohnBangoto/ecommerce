import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { supabase } from '../lib/supabase.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = express.Router();

const emailSchema = z.string().trim().email().max(255).transform((value) => value.toLowerCase());

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

const signAuthToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' },
  );

const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  createdAt: user.createdAt,
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Create a new customer account
 *     tags: [Authentification]
 */
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'An account already exists for this email address.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'customer',
      },
    });

    const token = signAuthToken(user);

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Unable to register the account right now.' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in with an existing account
 *     tags: [Authentification]
 */
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = signAuthToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Unable to log in right now.' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Retrieve the authenticated user profile
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Profile retrieval error:', error);
    return res.status(500).json({ message: 'Unable to load the user profile right now.' });
  }
});

const googleAuthSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const completeProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis').max(100),
  lastName: z.string().trim().min(1, 'Nom requis').max(100),
});

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Log in / register with Google OAuth via Supabase token
 *     tags: [Authentification]
 */
router.post('/google', validate({ body: googleAuthSchema }), async (req, res) => {
  try {
    const { token } = req.body;

    // Verify token with Supabase
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      console.error('Supabase token verification error:', error);
      return res.status(401).json({ message: 'Invalid or expired Google session.' });
    }

    const email = supabaseUser.email.toLowerCase();

    // Check if user exists in the local database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create a new user with Google OAuth profile info if available
      const firstName = supabaseUser.user_metadata?.given_name || supabaseUser.user_metadata?.first_name || null;
      const lastName = supabaseUser.user_metadata?.family_name || supabaseUser.user_metadata?.last_name || null;

      user = await prisma.user.create({
        data: {
          email,
          passwordHash: 'GOOGLE_OAUTH_USER', // placeholder value
          firstName,
          lastName,
          role: 'customer',
        },
      });
      console.log(`Created new customer account via Google: ${email}`);
    }

    const localToken = signAuthToken(user);

    return res.json({
      message: 'Google login successful.',
      token: localToken,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ message: 'Unable to authenticate with Google right now.' });
  }
});

/**
 * @swagger
 * /api/auth/complete-profile:
 *   put:
 *     summary: Complete missing user profile information
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 */
router.put('/complete-profile', authenticateToken, validate({ body: completeProfileSchema }), async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName,
        lastName,
      },
    });

    return res.json({
      message: 'Profile completed successfully.',
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error('Profile completion error:', error);
    return res.status(500).json({ message: 'Unable to update profile right now.' });
  }
});

export default router;
