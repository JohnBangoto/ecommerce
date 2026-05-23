const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

/**
 * Utilitaire de requêtes HTTP natif (fetch) pour communiquer avec le backend Express
 */
export async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Récupérer le token d'authentification stocké localement selon le type de requête (admin ou client)
  const isAdminRequest = options.isAdmin || endpoint.startsWith('/admin') || endpoint.includes('/status');
  const token = isAdminRequest
    ? localStorage.getItem('luxora-admin-token')
    : localStorage.getItem('luxora-token');
  
  const headers = {
    ...options.headers,
  };

  // N'ajoute pas de Content-Type si c'est un FormData (pour l'upload Multer)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    // Gérer le cas d'une suppression réussie qui ne renvoie pas de JSON ou un corps vide
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorMsg = data?.message || `Erreur HTTP : ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`Erreur d'appel API [${options.method || 'GET'} ${endpoint}] :`, error);
    throw error;
  }
}

export const api = {
  get: (endpoint, options = {}) => apiCall(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiCall(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  postMultipart: (endpoint, formData, options = {}) => apiCall(endpoint, { ...options, method: 'POST', body: formData }),
  put: (endpoint, body, options = {}) => apiCall(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  putMultipart: (endpoint, formData, options = {}) => apiCall(endpoint, { ...options, method: 'PUT', body: formData }),
  delete: (endpoint, options = {}) => apiCall(endpoint, { ...options, method: 'DELETE' }),
};
