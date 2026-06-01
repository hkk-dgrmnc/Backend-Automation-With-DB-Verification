import type { APIRequestContext, APIResponse } from '@playwright/test';
import { endpoints } from '../config/endpoints';

export class KampanyaClient {
  constructor(private readonly request: APIRequestContext) {}

  async addKampanyaKategori(
    payload: Record<string, unknown>,
    headers: Record<string, string> = {}
  ): Promise<APIResponse> {
    return this.request.post(endpoints.kampanya.addKampanyaKategori, {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...headers
      },
      data: payload
    });
  }
}
