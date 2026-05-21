import { AsyncLocalStorage } from 'async_hooks';
import { relative } from 'path';
import type { APIResponse, TestInfo } from '@playwright/test';
import { env } from '../config/env';

const logLevels = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

const sensitiveKeys = [
  'authorization',
  'cookie',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'apikey'
];

type LogContext = {
  testTitle: string;
  testFile: string;
  projectName: string;
  retry: number;
  workerIndex: number;
};

const logContextStorage = new AsyncLocalStorage<LogContext>();
let activeLogContext: LogContext | undefined;

function getLogLevelValue(level: string) {
  return logLevels[level as keyof typeof logLevels] ?? logLevels.silent;
}

function shouldLog(level: keyof typeof logLevels) {
  return getLogLevelValue(env.logging.level) >= logLevels[level];
}

function isSensitiveKey(key: string) {
  const normalizedKey = key.toLowerCase();
  return sensitiveKeys.some((sensitiveKey) => normalizedKey.includes(sensitiveKey.toLowerCase()));
}

function sanitizeForLog(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, seen));
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  const sanitizedValue: Record<string, unknown> = {};

  for (const [key, itemValue] of Object.entries(value as Record<string, unknown>)) {
    sanitizedValue[key] = isSensitiveKey(key) ? '[MASKED]' : sanitizeForLog(itemValue, seen);
  }

  return sanitizedValue;
}

function formatValue(value: unknown) {
  const jsonValue = JSON.stringify(sanitizeForLog(value), null, 2);

  if (jsonValue.length <= env.logging.maxBodyLength) {
    return jsonValue;
  }

  return `${jsonValue.slice(0, env.logging.maxBodyLength)}\n... [log kısaltıldı]`;
}

function escapeLogLabel(value: string) {
  return value.replaceAll('"', '\\"');
}

function buildLogContext(testInfo: TestInfo): LogContext {
  return {
    testTitle: testInfo.title,
    testFile: relative(process.cwd(), testInfo.file),
    projectName: testInfo.project.name,
    retry: testInfo.retry,
    workerIndex: testInfo.workerIndex
  };
}

function getContextPrefix() {
  const context = logContextStorage.getStore() ?? activeLogContext;

  if (!context) {
    return '';
  }

  const parts = [
    ` [TEST="${escapeLogLabel(context.testTitle)}"]`,
    ` [DOSYA="${escapeLogLabel(context.testFile)}"]`
  ];

  if (context.projectName) {
    parts.push(` [PROJECT="${escapeLogLabel(context.projectName)}"]`);
  }

  parts.push(` [WORKER=${context.workerIndex}]`);
  parts.push(` [RETRY=${context.retry}]`);

  return parts.join('');
}

function writeLog(level: keyof typeof logLevels, title: string, value?: unknown) {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]${getContextPrefix()}`;

  if (value === undefined) {
    console.log(`${prefix} ${title}`);
    return;
  }

  console.log(`${prefix} ${title}\n${formatValue(value)}`);
}

/**
 * Bir testin içindeki loglara otomatik test bilgisi ekler.
 *
 * Kullanım:
 * await withTestLogContext(testInfo, async () => {
 *   logApiRequest('GET', '/products/1');
 * });
 *
 * Log çıktısında test adı, dosya, worker ve retry bilgisi görünür.
 * Parallel testlerde logların hangi teste ait olduğunu ayırmak için kullanılır.
 */
export async function withTestLogContext<T>(testInfo: TestInfo, action: () => Promise<T>): Promise<T> {
  return logContextStorage.run(buildLogContext(testInfo), action);
}

/**
 * Playwright fixture'ı tarafından test başlamadan log context'i set eder.
 * Test dosyalarında tek tek wrapper yazmaya gerek bırakmaz.
 */
export function setTestLogContext(testInfo: TestInfo) {
  activeLogContext = buildLogContext(testInfo);
}

/**
 * Playwright fixture'ı tarafından test bitince context'i temizler.
 * Aynı worker içinde sonraki teste eski test bilgisinin sızmasını engeller.
 */
export function clearTestLogContext() {
  activeLogContext = undefined;
}

/**
 * Genel debug log basar.
 * Normal koşulda kapalıdır; `.env` içinde `LOG_LEVEL=debug` verilirse çalışır.
 */
export function logDebug(title: string, value?: unknown) {
  writeLog('debug', title, value);
}

/**
 * Genel bilgi logu basar.
 * `.env` içinde `LOG_LEVEL=info` veya `LOG_LEVEL=debug` olduğunda çalışır.
 */
export function logInfo(title: string, value?: unknown) {
  writeLog('info', title, value);
}

/**
 * Uyarı logu basar.
 * `.env` içinde `LOG_LEVEL=warn`, `info` veya `debug` olduğunda çalışır.
 */
export function logWarn(title: string, value?: unknown) {
  writeLog('warn', title, value);
}

/**
 * Hata logu basar.
 * `.env` içinde `LOG_LEVEL=error`, `warn`, `info` veya `debug` olduğunda çalışır.
 */
export function logError(title: string, value?: unknown) {
  writeLog('error', title, value);
}

/**
 * API request bilgisini merkezi formatta loglar.
 *
 * Body ve header gibi hassas olabilecek değerler sadece `LOG_PAYLOADS=true` ise basılır.
 * Testlerde request atmadan hemen önce kullanılabilir.
 */
export function logApiRequest(method: string, endpoint: string, body?: unknown, headers?: Record<string, unknown>) {
  const logValue: Record<string, unknown> = {
    method,
    endpoint,
    baseUrl: env.baseUrl
  };

  if (body !== undefined) {
    logValue.body = env.logging.includePayloads ? body : '[LOG_PAYLOADS=false olduğu için body gizlendi]';
  }

  if (headers !== undefined) {
    logValue.headers = env.logging.includePayloads ? headers : '[LOG_PAYLOADS=false olduğu için header gizlendi]';
  }

  logDebug('API REQUEST', logValue);
}

/**
 * API response bilgisini merkezi formatta loglar.
 *
 * Response body sadece `LOG_PAYLOADS=true` ise basılır.
 * Status, ok bilgisi ve URL debug modda görülebilir.
 */
export function logApiResponse(response: APIResponse, body?: unknown) {
  const logValue: Record<string, unknown> = {
    status: response.status(),
    ok: response.ok(),
    url: response.url()
  };

  if (body !== undefined) {
    logValue.body = env.logging.includePayloads ? body : '[LOG_PAYLOADS=false olduğu için response body gizlendi]';
  }

  logDebug('API RESPONSE', logValue);
}

/**
 * Database query bilgisini loglar.
 *
 * Bu helper sadece merkezi dbClient tarafından kullanılır.
 * `LOG_DB_QUERIES=true` değilse query ve parametreler basılmaz.
 */
export function logDbQuery(queryText: string, params: unknown[]) {
  if (!env.logging.includeDbQueries) {
    return;
  }

  logDebug('DATABASE QUERY', {
    query: queryText,
    params
  });
}

/**
 * Database sonucunu loglar.
 *
 * Row içerikleri sadece `LOG_PAYLOADS=true` ise basılır.
 * Aksi halde sadece kaç row döndüğü ve query süresi görülür.
 */
export function logDbResult(rows: unknown[], elapsedMs: number) {
  if (!env.logging.includeDbQueries) {
    return;
  }

  logDebug('DATABASE RESULT', {
    elapsedMs,
    rowCount: rows.length,
    rows: env.logging.includePayloads ? rows : '[LOG_PAYLOADS=false olduğu için rows gizlendi]'
  });
}
