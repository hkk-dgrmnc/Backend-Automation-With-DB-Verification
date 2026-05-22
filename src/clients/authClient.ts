import type { APIRequestContext, APIResponse } from '@playwright/test';
import { endpoints } from '../config/endpoints';

export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async login(loginBody: Record<string, unknown>): Promise<APIResponse> {
    return this.request.post(endpoints.auth.login, {
      headers: {
        accept: '*/*',
        'Content-Type': 'application/json'
      },
      data: loginBody
    });
  }
}
