import { MusteriKartiClient } from '../../src/clients/project/musteriKartiClient';
import { env } from '../../src/config/env';
import { expectFieldsEqual, expectObjectHasFields, expectStatus } from '../../src/utils/assertions';
import { getProjectAuthorizationHeaders } from '../../src/utils/projectTokenManager';
import { readJson } from '../../src/utils/responseHelper';
import { test } from './fixtures/projectApiTest';

test.describe('Project Musteri Karti API', () => {
  test.skip(!env.project.testsEnabled, 'Gerçek proje API testleri kapalı. Çalıştırmak için PROJECT_TESTS_ENABLED=true yap.');

  test('gets customer cards with paging successfully', async ({ projectRequest }) => {
    const musteriKartiClient = new MusteriKartiClient(projectRequest);
    const authHeaders = await getProjectAuthorizationHeaders(projectRequest);

    const response = await musteriKartiClient.getAllWithPaging(10, 1, authHeaders);

    expectStatus(response, 200);

    const body = await readJson(response);

    expectObjectHasFields(body, ['data', 'statusCode', 'isError']);
    expectFieldsEqual(body.statusCode, 200);
    expectFieldsEqual(body.isError, false);
  });
});
