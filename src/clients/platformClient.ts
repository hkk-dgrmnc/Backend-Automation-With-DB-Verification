import type { APIRequestContext, APIResponse } from '@playwright/test';
import { endpoints } from '../config/endpoints';

export class PlatformClient {
  constructor(private readonly request: APIRequestContext) {}

  async postPlatform(
    payload: Record<string, unknown>,
    headers: Record<string, string> = {}
  ): Promise<APIResponse> {
    return this.request.post(endpoints.platform.postPlatform, {
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        ...headers
      },
      data: payload
    });
  }
}
