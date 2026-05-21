/**
 * Helpers utility to dynamically adapt color/size labels and placeholders based on product categories.
 */

const CATEGORY_MAP = {
  mode: {
    colorLabel: 'Couleur',
    colorPlaceholder: 'Ex: Noir, Marron, Blanc...',
    sizeLabel: 'Taille / Pointure',
    sizePlaceholder: 'Ex: XS, S, M, L, XL, 38, 39, 40...',
  },
  electronique: {
    colorLabel: 'Coloris / Finition',
    colorPlaceholder: 'Ex: Gris Sidéral, Argent, Or, Noir...',
    sizeLabel: 'Modèle / Capacité',
    sizePlaceholder: 'Ex: 128 Go, 256 Go, 512 Go, 1 To, 15 pouces...',
  },
  maison: {
    colorLabel: 'Couleur / Style',
    colorPlaceholder: 'Ex: Beige, Terracotta, Bois Naturel...',
    sizeLabel: 'Dimensions / Format',
    sizePlaceholder: 'Ex: 140x200cm, Ø 30cm, Unique...',
  },
  beaute: {
    colorLabel: 'Teinte / Parfum',
    colorPlaceholder: 'Ex: Nude, Coco, Vanille, Ambre...',
    sizeLabel: 'Contenance / Volume',
    sizePlaceholder: 'Ex: 30 ml, 50 ml, 100 ml, 200 ml...',
  },
  sport: {
    colorLabel: 'Couleur',
    colorPlaceholder: 'Ex: Noir mat, Bleu cobalt, Rose...',
    sizeLabel: 'Taille / Poids / Niveau',
    sizePlaceholder: 'Ex: 5 kg, 10 kg, M, L, Standard...',
  },
  alimentation: {
    colorLabel: 'Saveur / Variété',
    colorPlaceholder: 'Ex: Chocolat, Salé, Nature, Citron...',
    sizeLabel: 'Format / Poids net',
    sizePlaceholder: 'Ex: 250g, 500g, 1L, Lot de 3...',
  },
  jouets: {
    colorLabel: 'Couleur / Thème',
    colorPlaceholder: 'Ex: Rouge, Jaune, Spiderman, Princesses...',
    sizeLabel: 'Âge / Modèle',
    sizePlaceholder: 'Ex: 3-5 ans, 6-8 ans, 500 pièces, Standard...',
  },
};

const DEFAULT_MAP = {
  colorLabel: 'Couleur',
  colorPlaceholder: 'Ex: Rouge, Noir, Bleu...',
  sizeLabel: 'Taille / Modèle',
  sizePlaceholder: 'Ex: S, M, L, XL...',
};

/**
 * Returns the customized label for colors/variations based on the product category.
 * @param {string} category 
 * @returns {string}
 */
export function getCategoryColorLabel(category) {
  return CATEGORY_MAP[category]?.colorLabel || DEFAULT_MAP.colorLabel;
}

/**
 * Returns the customized placeholder for colors/variations based on the product category.
 * @param {string} category 
 * @returns {string}
 */
export function getCategoryColorPlaceholder(category) {
  return CATEGORY_MAP[category]?.colorPlaceholder || DEFAULT_MAP.colorPlaceholder;
}

/**
 * Returns the customized label for sizes/dimensions based on the product category.
 * @param {string} category 
 * @returns {string}
 */
export function getCategorySizeLabel(category) {
  return CATEGORY_MAP[category]?.sizeLabel || DEFAULT_MAP.sizeLabel;
}

/**
 * Returns the customized placeholder for sizes/dimensions based on the product category.
 * @param {string} category 
 * @returns {string}
 */
export function getCategorySizePlaceholder(category) {
  return CATEGORY_MAP[category]?.sizePlaceholder || DEFAULT_MAP.sizePlaceholder;
}
