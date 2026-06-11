import type { APIRequestContext, APIResponse } from '@playwright/test';
import { endpoints } from '../config/endpoints';

export class SozlesmeClient {
  constructor(private readonly request: APIRequestContext) {}

  async getByIdWithAllRelations(
    params: Record<string, string>,
    headers: Record<string, string> = {}
  ): Promise<APIResponse> {
    return this.request.get(endpoints.sozlesme.getByIdWithAllRelations, {
      headers: {
        accept: 'application/json',
        ...headers
      },
      params
    });
  }
}
