import type { APIRequestContext } from '@playwright/test';
import { ProjectAuthClient } from '../clients/project/authClient';
import { env } from '../config/env';

let cachedProjectToken: string | undefined;

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

export function extractProjectAuthToken(body: unknown) {
  const token = findTokenValue(body);

  if (!token) {
    throw new Error('Login response içinde token bulunamadı. Beklenen alanlar: token, accessToken, access_token veya data.token.');
  }

  return token;
}

export function cacheProjectAuthToken(token: string) {
  cachedProjectToken = token;
}

export function getCachedProjectAuthToken() {
  return cachedProjectToken;
}

export function clearProjectAuthToken() {
  cachedProjectToken = undefined;
}

export async function getProjectAuthToken(request: APIRequestContext) {
  if (cachedProjectToken) {
    return cachedProjectToken;
  }

  if (!env.project.auth.username || !env.project.auth.password) {
    throw new Error('PROJECT_AUTH_USERNAME ve PROJECT_AUTH_PASSWORD set edilmeden project auth token alınamaz.');
  }

  const authClient = new ProjectAuthClient(request);
  const response = await authClient.login({
    userName: env.project.auth.username,
    password: env.project.auth.password
  });

  if (!response.ok()) {
    throw new Error(`Project token request başarısız oldu. Status: ${response.status()}`);
  }

  const body = await response.json();
  const token = extractProjectAuthToken(body);
  cacheProjectAuthToken(token);

  return token;
}

export async function getProjectAuthorizationHeaders(request: APIRequestContext) {
  const token = await getProjectAuthToken(request);

  return {
    Authorization: `Bearer ${token}`
  };
}
