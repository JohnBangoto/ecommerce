import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Client Supabase côté serveur avec la clé service_role
 * — donne un accès complet sans restrictions RLS
 * — NE JAMAIS exposer cette clé côté client/frontend
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const STORAGE_BUCKET = 'product-images';
