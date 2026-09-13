// API Service connecting Frontend to Laravel Backend

const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('auth_token') || '';
}

export function setAuthSession(token, user) {
  if (token) localStorage.setItem('auth_token', token);
  if (user) localStorage.setItem('auth_user', JSON.stringify(user));
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthSession();
    // Signal auth expiration if needed
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `HTTP error ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function login(email, password) {
  const res = await apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res?.token) {
    setAuthSession(res.token, res.user);
  }
  return res;
}

export async function logout() {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } finally {
    clearAuthSession();
  }
}

export async function getCurrentUser() {
  return apiRequest('/user');
}

export async function getPages() {
  return apiRequest('/pages');
}

export async function createPage(name) {
  return apiRequest('/pages', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updatePage(id, payload) {
  return apiRequest(`/pages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deletePage(id) {
  return apiRequest(`/pages/${id}`, {
    method: 'DELETE',
  });
}

export async function reorderPages(pages) {
  const payload = pages.map((p, idx) => ({ id: p.id, order: idx }));
  return apiRequest('/pages/reorder', {
    method: 'POST',
    body: JSON.stringify({ pages: payload }),
  });
}

export async function getQueryCatalog() {
  return apiRequest('/query-catalog');
}

export async function fetchReportData(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.replace('/api', '') : endpoint;
  return apiRequest(cleanEndpoint);
}

export async function askAiGenerateChart(prompt, model = 'gemini-1.5-flash') {
  return apiRequest('/ai/generate-chart', {
    method: 'POST',
    body: JSON.stringify({ prompt, model }),
  });
}

export async function getDataMartMeta() {
  return apiRequest('/data-mart/meta');
}

export async function queryDataMart(payload) {
  return apiRequest('/data-mart/query', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function executeDataMartSql(sql) {
  return apiRequest('/data-mart/sql', {
    method: 'POST',
    body: JSON.stringify({ sql }),
  });
}

export async function saveLlmApiKey(llm_api_key) {
  return apiRequest('/user/llm-key', {
    method: 'POST',
    body: JSON.stringify({ llm_api_key }),
  });
}

export async function getUsers() {
  return apiRequest('/admin/users');
}

export async function createUser(payload) {
  return apiRequest('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id, payload) {
  return apiRequest(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id) {
  return apiRequest(`/admin/users/${id}`, {
    method: 'DELETE',
  });
}

