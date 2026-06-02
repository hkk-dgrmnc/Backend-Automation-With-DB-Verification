import type { APIRequestContext } from '@playwright/test';
import { AuthClient } from '../clients/authClient';
import { env } from '../config/env';

type CachedAuthToken = {
  token: string;
  expiresAtMs: number;
};

let cachedAuthToken: CachedAuthToken | undefined;
let pendingAuthToken: Promise<string> | undefined;

function findJwtExpiryMs(token: string) {
  const payload = token.split('.')[1];

  if (!payload) {
    return undefined;
  }

  try {
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;

    if (typeof body.exp === 'number' && Number.isFinite(body.exp)) {
      return body.exp * 1000;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isTokenUsable(cachedToken: CachedAuthToken) {
  return Date.now() + env.auth.tokenExpirySkewMs < cachedToken.expiresAtMs;
}

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
  cachedAuthToken = {
    token,
    expiresAtMs: findJwtExpiryMs(token) ?? Date.now() + env.auth.tokenCacheTtlMs
  };
}

export function getCachedAuthToken() {
  if (!cachedAuthToken || !isTokenUsable(cachedAuthToken)) {
    cachedAuthToken = undefined;
    return undefined;
  }

  return cachedAuthToken.token;
}

export function clearAuthToken() {
  cachedAuthToken = undefined;
}

async function requestAuthToken(request: APIRequestContext) {
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

export async function getAuthToken(request: APIRequestContext) {
  const cachedToken = getCachedAuthToken();

  if (cachedToken) {
    return cachedToken;
  }

  const currentAuthTokenRequest = pendingAuthToken ??= requestAuthToken(request);

  try {
    return await currentAuthTokenRequest;
  } finally {
    if (pendingAuthToken === currentAuthTokenRequest) {
      pendingAuthToken = undefined;
    }
  }
}

export async function getAuthorizationHeaders(request: APIRequestContext) {
  const token = await getAuthToken(request);

  return {
    Authorization: `Bearer ${token}`
  };
}
