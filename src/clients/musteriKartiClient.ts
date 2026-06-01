import type { APIRequestContext, APIResponse } from '@playwright/test';
import { endpoints } from '../config/endpoints';

export class MusteriKartiClient {
  constructor(private readonly request: APIRequestContext) {}

  async getAllWithPaging(
    pagingParams: Record<string, number | string>,
    headers: Record<string, string>
  ): Promise<APIResponse> {
    return this.request.get(endpoints.musteriKarti.getAllWithPaging(pagingParams), {
      headers: {
        Accept: 'application/json',
        ...headers
      }
    });
  }

  async getAllMusteriKartiNames(
    headers: Record<string, string> = {}
  ): Promise<APIResponse> {
    return this.request.get(endpoints.musteriKarti.getAllMusteriKartiNames, {
      headers: {
        accept: 'application/json',
        ...headers
      }
    });
  }
}
