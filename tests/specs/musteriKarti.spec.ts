import { MusteriKartiClient } from '../../src/clients/musteriKartiClient';
import { endpoints } from '../../src/config/endpoints';
import { env } from '../../src/config/env';
import * as apiAssert from '../../src/utils/assertions';
import * as logger from '../../src/utils/logger';
import * as testDataGenerator from '../../src/utils/testDataGenerator';
import { getAuthorizationHeaders } from '../../src/utils/tokenManager';
import { readJson } from '../../src/utils/responseHelper';
import { getAllMusteriKartiWithPagingParams } from '../data/musteriKartiParams';
import { expect, test } from '../fixtures/apiTest';

test.describe('Musteri Karti API', () => {
  test.skip(!env.testsEnabled, 'Gercek API testleri kapali. Calistirmak icin TESTS_ENABLED=true yap.');

  test('getAllMusteriKartiWithPaging returns success and the PTT response wrapper', async ({ apiRequest }) => {
    const musteriKartiClient = new MusteriKartiClient(apiRequest);
    const params = getAllMusteriKartiWithPagingParams();
    const authHeaders = await getAuthorizationHeaders(apiRequest);

    logger.logApiRequest('GET', endpoints.musteriKarti.getAllMusteriKartiWithPaging, undefined, authHeaders, params);

    const response = await musteriKartiClient.getAllMusteriKartiWithPaging(params, authHeaders);

    await logger.logApiResponseWithBody(response);

    apiAssert.expectStatus(response, 200);

    const body = await readJson(response);

    apiAssert.expectObjectHasFields(body, ['data', 'statusCode', 'isError']);
    apiAssert.expectFieldsEqual(body.statusCode, 200);
    apiAssert.expectFieldsEqual(body.isError, false);
  });

  // api-test-generator:musteriKarti.getAllMusteriKartiNames
  test('getAllMusteriKartiNames returns success', async ({ apiRequest }) => {
    const musteriKartiClient = new MusteriKartiClient(apiRequest);
    const authHeaders = await getAuthorizationHeaders(apiRequest);

    logger.logApiRequest('GET', endpoints.musteriKarti.getAllMusteriKartiNames, undefined, authHeaders);

    const response = await musteriKartiClient.getAllMusteriKartiNames(authHeaders);

    await logger.logApiResponseWithBody(response);

    apiAssert.expectStatus(response, 200);
  });
});
