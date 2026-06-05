-- =====================================================================
-- SCRIPT DE CRÉATION DE BASE DE DONNÉES SECURISÉE POUR SUPABASE & PRISMA
-- Projet : LUXORA E-commerce
-- Auteur : Antigravity AI
-- Date : 2026-05-30
-- =====================================================================

-- Suppression propre des anciennes tables pour réinitialisation (ordre strict des dépendances)
DROP TABLE IF EXISTS "OrderItem" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "Review" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- =====================================================================
-- 1. CRÉATION DES TABLES AVEC CORRESPONDANCE DE CASSE EXACTE (camelCase)
-- =====================================================================

-- Table des Utilisateurs
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" VARCHAR(100),
    "lastName" VARCHAR(100),
    "role" VARCHAR(50) DEFAULT 'customer' NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table des Produits
CREATE TABLE "Product" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "image" TEXT NOT NULL, -- URL de l'image principale
    "images" TEXT,         -- Liste d'URLs séparées par des virgules ou JSON string
    "sizes" TEXT,          -- Tailles (ex: 'S,M,L')
    "colors" TEXT,         -- Couleurs (ex: 'Noir,Rouge')
    "rating" DOUBLE PRECISION DEFAULT 4.5 NOT NULL,
    "reviewsCount" INTEGER DEFAULT 0 NOT NULL,
    "isFeatured" BOOLEAN DEFAULT FALSE NOT NULL,
    "isNew" BOOLEAN DEFAULT TRUE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table des Avis (Reviews)
CREATE TABLE "Review" (
    "id" SERIAL PRIMARY KEY,
    "productId" INTEGER NOT NULL,
    "author" VARCHAR(255) NOT NULL,
    "rating" INTEGER NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
    "comment" TEXT NOT NULL,
    "date" VARCHAR(50) NOT NULL, -- Format local 'dd/mm/yyyy'
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Clé étrangère : suppression en cascade si le produit est supprimé
    CONSTRAINT fk_review_product FOREIGN KEY ("productId")
        REFERENCES "Product" ("id")
        ON DELETE CASCADE
);

-- Table des Commandes
CREATE TABLE "Order" (
    "id" VARCHAR(100) PRIMARY KEY, -- Exemple : CMD-1716382041
    "userId" INTEGER,
    "total" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(50) DEFAULT 'confirmed' NOT NULL,
    "paymentStatus" VARCHAR(50) DEFAULT 'paid' NOT NULL,
    "shippingAddress" TEXT NOT NULL, -- JSON stringifié
    "trackingNumber" VARCHAR(100) NOT NULL,
    "trackingAccessHash" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Clé étrangère : anonymise la commande si l'utilisateur supprime son compte
    CONSTRAINT fk_order_user FOREIGN KEY ("userId")
        REFERENCES "User" ("id")
        ON DELETE SET NULL
);

-- Table des Articles de Commande (OrderItems)
CREATE TABLE "OrderItem" (
    "id" SERIAL PRIMARY KEY,
    "orderId" VARCHAR(100) NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "price" DOUBLE PRECISION NOT NULL,
    "size" VARCHAR(50),
    "color" VARCHAR(50),
    
    -- Clé étrangère : supprime les items si la commande parent est supprimée
    CONSTRAINT fk_item_order FOREIGN KEY ("orderId")
        REFERENCES "Order" ("id")
        ON DELETE CASCADE,
        
    -- Clé étrangère : bloque la suppression d'un produit s'il est lié à une commande
    CONSTRAINT fk_item_product FOREIGN KEY ("productId")
        REFERENCES "Product" ("id")
        ON DELETE RESTRICT
);

-- =====================================================================
-- 2. UTILS ET SÉCURITÉ : SYSTÈME HYBRIDE EXPRESS + SUPABASE
-- =====================================================================

-- Fonction d'obtention de l'ID utilisateur courant
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
DECLARE
    v_app_user_id TEXT;
BEGIN
    -- 1. Tente de récupérer la variable locale définie par le backend Express
    v_app_user_id := current_setting('app.current_user_id', true);
    IF v_app_user_id IS NOT NULL AND v_app_user_id <> '' THEN
        RETURN v_app_user_id::INTEGER;
    END IF;

    -- 2. Tente de récupérer depuis les métadonnées JWT de Supabase Auth
    IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
        RETURN (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'id')::INTEGER;
    END IF;

    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction d'obtention du rôle utilisateur courant
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    v_app_role TEXT;
BEGIN
    -- 1. Tente de récupérer la variable locale définie par le backend Express
    v_app_role := current_setting('app.current_user_role', true);
    IF v_app_role IS NOT NULL AND v_app_role <> '' THEN
        RETURN v_app_role;
    END IF;

    -- 2. Tente de récupérer depuis les claims JWT de Supabase
    IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
        RETURN COALESCE(
            current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role',
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
            'customer'
        );
    END IF;

    RETURN 'customer';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'customer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction utilitaire pour vérifier si l'utilisateur connecté est Administrateur
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 3. TRIGGER : PROTECTION CONTRE L'ESCALADE DE PRIVILÈGES
-- =====================================================================

-- Empêche un utilisateur classique de modifier son propre rôle ou de s'auto-attribuer 'admin'
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role <> OLD.role AND NOT is_admin() THEN
        NEW.role := OLD.role; -- Restauration du rôle d'origine
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION prevent_role_escalation();

-- =====================================================================
-- 4. ACTIVATION RLS & CRÉATION DES POLITIQUES DE SÉCURITÉ (POLICIES)
-- =====================================================================

-- A. Table : User
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on User" 
ON "User" FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view their own profile" 
ON "User" FOR SELECT 
USING (id = get_current_user_id());

CREATE POLICY "Anyone can register" 
ON "User" FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own profile" 
ON "User" FOR UPDATE 
USING (id = get_current_user_id())
WITH CHECK (id = get_current_user_id());

-- B. Table : Product
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products" 
ON "Product" FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage products" 
ON "Product" FOR ALL 
USING (is_admin());

-- C. Table : Review
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" 
ON "Review" FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can write reviews" 
ON "Review" FOR INSERT 
WITH CHECK (get_current_user_id() IS NOT NULL);

CREATE POLICY "Admins or authors can update their reviews" 
ON "Review" FOR UPDATE 
USING (
    is_admin() OR 
    author = (SELECT email FROM "User" WHERE id = get_current_user_id()) OR
    author = (SELECT concat("firstName", ' ', "lastName") FROM "User" WHERE id = get_current_user_id())
);

CREATE POLICY "Admins or authors can delete their reviews" 
ON "Review" FOR DELETE 
USING (
    is_admin() OR 
    author = (SELECT email FROM "User" WHERE id = get_current_user_id()) OR
    author = (SELECT concat("firstName", ' ', "lastName") FROM "User" WHERE id = get_current_user_id())
);

-- D. Table : Order
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view and manage all orders" 
ON "Order" FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view their own orders" 
ON "Order" FOR SELECT 
USING (id = current_setting('app.current_order_id', true) OR "userId" = get_current_user_id());

CREATE POLICY "Authenticated users can create orders" 
ON "Order" FOR INSERT 
WITH CHECK (get_current_user_id() IS NOT NULL OR "userId" = get_current_user_id());

-- E. Table : OrderItem
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view and manage all order items" 
ON "OrderItem" FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view their own order items" 
ON "OrderItem" FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM "Order" 
        WHERE "Order".id = "OrderItem"."orderId" 
        AND ("Order"."userId" = get_current_user_id() OR "Order".id = current_setting('app.current_order_id', true))
    )
);

CREATE POLICY "Authenticated users can add items to orders" 
ON "OrderItem" FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Order" 
        WHERE "Order".id = "OrderItem"."orderId" 
        AND ("Order"."userId" = get_current_user_id() OR "Order".id = current_setting('app.current_order_id', true))
    )
);

-- =====================================================================
-- 5. INDEX DE PERFORMANCE SUR LES CLÉS ÉTRANGÈRES
-- =====================================================================
CREATE INDEX idx_review_product_id ON "Review"("productId");
CREATE INDEX idx_order_user_id ON "Order"("userId");
CREATE INDEX idx_order_item_order_id ON "OrderItem"("orderId");
CREATE INDEX idx_order_item_product_id ON "OrderItem"("productId");

-- Fin du script 