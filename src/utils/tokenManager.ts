import type { APIRequestContext } from '@playwright/test';
import { AuthClient } from '../clients/authClient';
import { env } from '../config/env';

let cachedAuthToken: string | undefined;

function findTokenValue(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const responseBody = body as Record<string, unknown>;
  const directToken = responseBody.token ?? responseBody.accessToken ?? responseBody.access_token;

  if (typeof directToken === 'string' && directToken.trim()) {
    return directToken;
  }

  const data = responseBody.data;

  if (data && typeof data === 'object') {
    const dataBody = data as Record<string, unknown>;
    const nestedToken = dataBody.token ?? dataBody.accessToken ?? dataBody.access_token;

    if (typeof nestedToken === 'string' && nestedToken.trim()) {
      return nestedToken;
    }
  }

  return undefined;
}

export function extractAuthToken(body: unknown) {
  const token = findTokenValue(body);

  if (!token) {
    throw new Error('Login response içinde token bulunamadı. Beklenen alanlar: token, accessToken, access_token veya data.token.');
  }

  return token;
}

export function cacheAuthToken(token: string) {
  cachedAuthToken = token;
}

export function getCachedAuthToken() {
  return cachedAuthToken;
}

export function clearAuthToken() {
  cachedAuthToken = undefined;
}

export async function getAuthToken(request: APIRequestContext) {
  if (cachedAuthToken) {
    return cachedAuthToken;
  }

  if (!env.auth.username || !env.auth.password) {
    throw new Error('AUTH_USERNAME ve AUTH_PASSWORD set edilmeden auth token alınamaz.');
  }

  const authClient = new AuthClient(request);
  const response = await authClient.login({
    userName: env.auth.username,
    password: env.auth.password
  });

  if (!response.ok()) {
    throw new Error(`Token request başarısız oldu. Status: ${response.status()}`);
  }

  const body = await response.json();
  const token = extractAuthToken(body);
  cacheAuthToken(token);

  return token;
}

export async function getAuthorizationHeaders(request: APIRequestContext) {
  const token = await getAuthToken(request);

  return {
    Authorization: `Bearer ${token}`
  };
}
