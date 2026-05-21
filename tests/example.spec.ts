import { test } from './fixtures/apiTest';
import { ExampleClient } from '../src/clients/exampleClient';
import { endpoints } from '../src/config/endpoints';
import {
  expectFieldDefined,
  expectHeaderContains,
  expectObjectFieldEquals,
  expectObjectHasFields,
  expectStatus
} from '../src/utils/assertions';
import { logApiRequest, logApiResponse } from '../src/utils/logger';
import { readJson } from '../src/utils/responseHelper';
import {
  createProductPayload,
  createProductWithNestedDetailsPayload,
  updateProductPayload
} from './data/examplePayloads';

test.describe('Example API', () => {
  test('gets a product by id as plain JSON', async ({ request }) => {
    const exampleClient = new ExampleClient(request);

    logApiRequest('GET', endpoints.example.productById(1));

    const response = await exampleClient.getProductById(1);

    expectStatus(response, 200);

    const body = await readJson(response);
    logApiResponse(response, body);

    expectFieldDefined(body.id);
    expectFieldDefined(body.title);
    expectFieldDefined(body.price);
    expectObjectFieldEquals(body, 'id', 1);
  });

  test('creates a product with payload from test data builder', async ({ request }) => {
    const exampleClient = new ExampleClient(request);
    const productPayload = createProductPayload({
      price: 149.99
    });

    logApiRequest('POST', endpoints.example.products, productPayload);

    const response = await exampleClient.createProduct(productPayload);

    expectStatus(response, 201);
    expectHeaderContains(response, 'content-type', 'application/json');

    const body = await readJson(response);
    logApiResponse(response, body);

    expectObjectHasFields(body, ['id', 'title', 'price', 'description', 'image', 'category']);
    expectObjectFieldEquals(body, 'title', productPayload.title);
    expectObjectFieldEquals(body, 'price', productPayload.price);
    expectObjectFieldEquals(body, 'category', productPayload.category);
  });

  test('updates a product with payload from the same domain payload file', async ({ request }) => {
    const exampleClient = new ExampleClient(request);
    const productPayload = updateProductPayload({
      title: 'Updated product from payload builder'
    });

    logApiRequest('PUT', endpoints.example.productById(1), productPayload);

    const response = await exampleClient.updateProduct(1, productPayload);

    expectStatus(response, 200);
    expectHeaderContains(response, 'content-type', 'application/json');

    const body = await readJson(response);
    logApiResponse(response, body);

    expectObjectHasFields(body, ['id', 'title', 'price', 'description', 'image', 'category']);
    expectObjectFieldEquals(body, 'id', 1);
    expectObjectFieldEquals(body, 'title', productPayload.title);
    expectObjectFieldEquals(body, 'price', productPayload.price);
  });

  test('creates a product with nested payload and targeted nested overrides', async ({ request }) => {
    const exampleClient = new ExampleClient(request);
    const productPayload = createProductWithNestedDetailsPayload({
      details: {
        stock: {
          quantity: 25
        },
        warranty: {
          period: 36
        }
      },
      metadata: {
        attributes: {
          fragile: true
        }
      }
    });

    const details = productPayload.details as Record<string, unknown>;
    const stock = details.stock as Record<string, unknown>;
    const dimensions = details.dimensions as Record<string, unknown>;
    const warranty = details.warranty as Record<string, unknown>;
    const metadata = productPayload.metadata as Record<string, unknown>;
    const attributes = metadata.attributes as Record<string, unknown>;

    expectObjectFieldEquals(stock, 'quantity', 25);
    expectObjectFieldEquals(stock, 'warehouseCode', 'TR-IST-01');
    expectObjectFieldEquals(dimensions, 'unit', 'cm');
    expectObjectFieldEquals(warranty, 'period', 36);
    expectObjectFieldEquals(attributes, 'fragile', true);
    expectObjectFieldEquals(attributes, 'returnable', true);

    logApiRequest('POST', endpoints.example.products, productPayload);

    const response = await exampleClient.createProduct(productPayload);

    expectStatus(response, 201);
    expectHeaderContains(response, 'content-type', 'application/json');

    const body = await readJson(response);
    logApiResponse(response, body);

    expectObjectHasFields(body, ['id', 'title', 'price', 'description', 'image', 'category']);
    expectObjectFieldEquals(body, 'title', productPayload.title);
    expectObjectFieldEquals(body, 'price', productPayload.price);
  });
});
