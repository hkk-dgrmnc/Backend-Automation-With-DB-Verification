import { SozlesmeClient } from '../../src/clients/sozlesmeClient';
import { endpoints } from '../../src/config/endpoints';
import { env } from '../../src/config/env';
import * as apiAssert from '../../src/utils/assertions';
import * as logger from '../../src/utils/logger';
import * as testDataGenerator from '../../src/utils/testDataGenerator';
import { readJson } from '../../src/utils/responseHelper';
import { getAuthorizationHeaders } from '../../src/utils/tokenManager';
import { getByIdWithAllRelationsParams } from '../data/sozlesmeParams';
import { expect, test } from '../fixtures/apiTest';

test.describe('Sozlesme API', () => {
  test.skip(!env.testsEnabled, 'Gerçek API testleri kapalı. Çalıştırmak için TESTS_ENABLED=true yap.');

  test('getByIdWithAllRelations returns success', async ({ apiRequest }) => {
    const sozlesmeClient = new SozlesmeClient(apiRequest);
    const params = getByIdWithAllRelationsParams();
    const authHeaders = await getAuthorizationHeaders(apiRequest);

    logger.logApiRequest('GET', endpoints.sozlesme.getByIdWithAllRelations, undefined, authHeaders);

    const response = await sozlesmeClient.getByIdWithAllRelations(params, authHeaders);

    apiAssert.expectStatus(response, 200);

    const body = await readJson(response);
    logger.logApiResponse(response, body);

    // Basit API testi: status ve response body'nin plain JSON object geldiğini doğrular.
    apiAssert.expectFieldType(body, 'object');

    // Response şeması Swagger'da tanımlı değil. Gerçek response görüldükten sonra
    // (PTT API'larındaki gibi) wrapper alanları açılabilir:
    // apiAssert.expectObjectHasFields(body, ['data', 'statusCode', 'isError']);
    // apiAssert.expectFieldsEqual(body.statusCode, 200);
    // apiAssert.expectFieldsEqual(body.isError, false);
  });
});
