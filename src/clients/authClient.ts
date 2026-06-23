import type { APIRequestContext, APIResponse } from '@playwright/test';
import { endpoints } from '../config/endpoints';

export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async login(
    payload: Record<string, unknown>,
    headers: Record<string, string> = {}
  ): Promise<APIResponse> {
    return this.request.post(endpoints.auth.login, {
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        ...headers
      },
      data: payload
    });
  }
}
