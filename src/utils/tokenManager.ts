import type { APIRequestContext } from '@playwright/test';
import { endpoints } from '../config/endpoints';
import { env } from '../config/env';

let cachedToken: string | undefined;

export async function getAuthToken(request: APIRequestContext) {
  if (cachedToken) {
    return cachedToken;
  }

  if (!env.auth.username || !env.auth.password) {
    throw new Error('AUTH_USERNAME and AUTH_PASSWORD must be set before requesting an auth token.');
  }

  const response = await request.post(endpoints.auth.login, {
    data: {
      username: env.auth.username,
      password: env.auth.password
    }
  });

  if (!response.ok()) {
    throw new Error(`Token request failed with status ${response.status()}.`);
  }

  const body = await response.json();
  cachedToken = body.token;

  if (!cachedToken) {
    throw new Error('Token response did not include a token field.');
  }

  return cachedToken;
}

export async function getAuthorizationHeaders(request: APIRequestContext) {
  const token = await getAuthToken(request);

  return {
    Authorization: `Bearer ${token}`
  };
}

export function clearCachedToken() {
  cachedToken = undefined;
}
