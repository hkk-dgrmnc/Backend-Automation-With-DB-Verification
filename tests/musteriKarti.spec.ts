import { MusteriKartiClient } from '../src/clients/musteriKartiClient';
import { endpoints } from '../src/config/endpoints';
import { env } from '../src/config/env';
import { expectFieldsEqual, expectObjectHasFields, expectStatus } from '../src/utils/assertions';
import { logApiRequest, logApiResponse } from '../src/utils/logger';
import { getAuthorizationHeaders } from '../src/utils/tokenManager';
import { readJson } from '../src/utils/responseHelper';
import { getAllMusteriKartiPagingParams } from './data/musteriKartiParams';
import { test } from './fixtures/apiTest';

test.describe('Musteri Karti API', () => {
  test.skip(!env.testsEnabled, 'Gerçek API testleri kapalı. Çalıştırmak için TESTS_ENABLED=true yap.');

  test('gets customer cards with paging successfully', async ({ apiRequest }) => {
    const musteriKartiClient = new MusteriKartiClient(apiRequest);
    const pagingParams = getAllMusteriKartiPagingParams();
    const authHeaders = await getAuthorizationHeaders(apiRequest);

    logApiRequest('GET', endpoints.musteriKarti.getAllWithPaging(pagingParams), undefined, authHeaders);

    const response = await musteriKartiClient.getAllWithPaging(pagingParams, authHeaders);

    expectStatus(response, 200);

    const body = await readJson(response);
    logApiResponse(response, body);

    expectObjectHasFields(body, ['data', 'statusCode', 'isError']);
    expectFieldsEqual(body.statusCode, 200);
    expectFieldsEqual(body.isError, false);
  });
});
