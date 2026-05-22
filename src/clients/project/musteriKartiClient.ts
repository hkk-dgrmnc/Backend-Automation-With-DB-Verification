import type { APIRequestContext, APIResponse } from '@playwright/test';
import { endpoints } from '../../config/endpoints';

export class MusteriKartiClient {
  constructor(private readonly request: APIRequestContext) {}

  async getAllWithPaging(
    pageSize: number | string,
    page: number | string,
    headers: Record<string, string>
  ): Promise<APIResponse> {
    return this.request.get(endpoints.project.musteriKarti.getAllWithPaging(pageSize, page), {
      headers: {
        Accept: 'application/json',
        ...headers
      }
    });
  }
}
