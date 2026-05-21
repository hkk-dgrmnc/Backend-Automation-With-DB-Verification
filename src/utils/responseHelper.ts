import type { APIResponse } from '@playwright/test';

export async function readJson(response: APIResponse) {
  return response.json();
}

export async function readText(response: APIResponse) {
  return response.text();
}
