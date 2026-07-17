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
  'apikey',
  'username'
];

type LogContext = {
  testTitle: string;
  testFile: string;
  runnerName: string;
  retry: number;
  workerIndex: number;
};

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

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  // seen "aktif yol" bazli tutulur: alt agac islendikten sonra deger kumeden
  // cikarilir. Boylece iki farkli dalda paylasilan ayni referans yanlislikla
  // [Circular] olarak maskelenmez; yalnizca gercek donguler yakalanir.
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeForLog(item, seen));
    }

    const sanitizedValue: Record<string, unknown> = {};

    for (const [key, itemValue] of Object.entries(value as Record<string, unknown>)) {
      sanitizedValue[key] = isSensitiveKey(key) ? '[MASKED]' : sanitizeForLog(itemValue, seen);
    }

    return sanitizedValue;
  } finally {
    seen.delete(value);
  }
}

function formatValue(value: unknown) {
  // JSON.stringify function/symbol icin undefined doner, BigInt icin TypeError
  // firlatir; loglama hicbir kosulda testin kendisini bozmamali.
  let jsonValue: string | undefined;

  try {
    jsonValue = JSON.stringify(sanitizeForLog(value), null, 2);
  } catch {
    jsonValue = undefined;
  }

  jsonValue ??= String(value);

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
    runnerName: testInfo.project.name,
    retry: testInfo.retry,
    workerIndex: testInfo.workerIndex
  };
}

function getContextPrefix() {
  const context = activeLogContext;

  if (!context) {
    return '';
  }

  const parts = [
    ` [TEST="${escapeLogLabel(context.testTitle)}"]`,
    ` [DOSYA="${escapeLogLabel(context.testFile)}"]`
  ];

  if (context.runnerName) {
    parts.push(` [RUNNER="${escapeLogLabel(context.runnerName)}"]`);
  }

  parts.push(` [WORKER=${context.workerIndex}]`);
  parts.push(` [RETRY=${context.retry}]`);

  return parts.join('');
}

function writeLog(level: keyof typeof logLevels, title: string, value?: unknown) {
  if (!shouldLog(level)) {
    return;
  }

  // CI sistemleri hatalari stderr'de bekler; error/warn dogru stream'e gider.
  const writeLine =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]${getContextPrefix()}`;

  if (value === undefined) {
    writeLine(`${prefix} ${title}`);
    return;
  }

  writeLine(`${prefix} ${title}\n${formatValue(value)}`);
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
 * Dikkat cekmesi gereken bilgi logunu ANSI destekleyen terminallerde kalin cyan basar.
 * TTY olmayan ortamlarda (CI logu, dosyaya yonlendirme) ANSI kodu eklenmez.
 */
export function logHighlight(title: string, value?: unknown) {
  const formattedTitle = process.stdout.isTTY ? `\x1b[1;36m${title}\x1b[0m` : title;
  writeLog('info', formattedTitle, value);
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
 * Body, header ve query param gibi hassas olabilecek değerler sadece `LOG_PAYLOADS=true` ise basılır.
 * Testlerde request atmadan hemen önce kullanılabilir.
 */
export function logApiRequest(
  method: string,
  endpoint: string,
  body?: unknown,
  headers?: Record<string, unknown>,
  params?: Record<string, string>
) {
  const logValue: Record<string, unknown> = {
    method,
    endpoint,
    baseUrl: env.baseUrl
  };

  if (params !== undefined) {
    logValue.params = env.logging.includePayloads ? params : '[LOG_PAYLOADS=false olduğu için params gizlendi]';
  }

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
 * Response body'yi loglama icin guvenli sekilde okur.
 *
 * JSON olmayan veya bos response'larda loglama yuzunden testi bozmaz.
 */
export async function logApiResponseWithBody(response: APIResponse) {
  if (!env.logging.includePayloads) {
    logApiResponse(response);
    return;
  }

  try {
    const text = await response.text();

    if (!text) {
      logApiResponse(response, text);
      return;
    }

    try {
      logApiResponse(response, JSON.parse(text));
    } catch {
      logApiResponse(response, text);
    }
  } catch (error) {
    logApiResponse(response, {
      logReadError: error instanceof Error ? error.message : String(error)
    });
  }
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
