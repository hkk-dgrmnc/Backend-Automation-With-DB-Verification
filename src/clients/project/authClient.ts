import type { APIRequestContext, APIResponse } from '@playwright/test';
import { endpoints } from '../../config/endpoints';

export class ProjectAuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async login(loginBody: Record<string, unknown>): Promise<APIResponse> {
    return this.request.post(endpoints.project.auth.login, {
      headers: {
        accept: '*/*',
        'Content-Type': 'application/json'
      },
      data: loginBody
    });
  }
}
