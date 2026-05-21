import type { APIRequestContext, APIResponse } from '@playwright/test';
import { endpoints } from '../config/endpoints';

export class ExampleClient {
  constructor(private readonly request: APIRequestContext) {}

  async getProducts(): Promise<APIResponse> {
    return this.request.get(endpoints.example.products);
  }

  async getProductById(productId: number | string): Promise<APIResponse> {
    return this.request.get(endpoints.example.productById(productId));
  }

  async createProduct(productBody: Record<string, unknown>): Promise<APIResponse> {
    return this.request.post(endpoints.example.products, {
      data: productBody
    });
  }

  async updateProduct(productId: number | string, productBody: Record<string, unknown>): Promise<APIResponse> {
    return this.request.put(endpoints.example.productById(productId), {
      data: productBody
    });
  }
}
