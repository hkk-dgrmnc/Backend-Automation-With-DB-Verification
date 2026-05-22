import { MusteriKartiClient } from '../../src/clients/project/musteriKartiClient';
import { endpoints } from '../../src/config/endpoints';
import { env } from '../../src/config/env';
import { expectFieldsEqual, expectObjectHasFields, expectStatus } from '../../src/utils/assertions';
import { logApiRequest, logApiResponse } from '../../src/utils/logger';
import { getProjectAuthorizationHeaders } from '../../src/utils/projectTokenManager';
import { readJson } from '../../src/utils/responseHelper';
import { getAllMusteriKartiPagingParams } from './data/musteriKartiParams';
import { test } from './fixtures/projectApiTest';

test.describe('Project Musteri Karti API', () => {
  test.skip(!env.project.testsEnabled, 'Gerçek proje API testleri kapalı. Çalıştırmak için PROJECT_TESTS_ENABLED=true yap.');

  test('gets customer cards with paging successfully', async ({ projectRequest }) => {
    const musteriKartiClient = new MusteriKartiClient(projectRequest);
    const pagingParams = getAllMusteriKartiPagingParams();
    const authHeaders = await getProjectAuthorizationHeaders(projectRequest);

    logApiRequest('GET', endpoints.project.musteriKarti.getAllWithPaging(pagingParams), undefined, authHeaders);

    const response = await musteriKartiClient.getAllWithPaging(pagingParams, authHeaders);

    expectStatus(response, 200);

    const body = await readJson(response);
    logApiResponse(response, body);

    expectObjectHasFields(body, ['data', 'statusCode', 'isError']);
    expectFieldsEqual(body.statusCode, 200);
    expectFieldsEqual(body.isError, false);
  });
});
