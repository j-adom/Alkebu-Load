import { request as httpsRequest } from 'node:https'

type HeaderStrategy = 'authorization' | 'bearer' | 'x-api-key'
type BodyStrategy = 'json'

type BatchConfig = {
  endpoint: string
  headerStrategy: HeaderStrategy
  bodyStrategy: BodyStrategy
}

export type ISBNdbBatchBook = {
  isbn13?: string
  isbn?: string
  [key: string]: unknown
}

type FetchISBNdbBatchOptions = {
  apiKey: string
  endpoints?: string[]
  logger?: (message: string) => void
  timeoutMs?: number
}

const DEFAULT_ENDPOINTS = [
  'https://api.isbndb.com/books',
  'https://api.premium.isbndb.com/books',
  'https://api2.isbndb.com/books',
]

const HEADER_STRATEGIES: HeaderStrategy[] = ['authorization', 'bearer', 'x-api-key']
const BODY_STRATEGIES: BodyStrategy[] = ['json']

let cachedBatchConfig: BatchConfig | null = null

const unique = (values: Array<string | undefined>): string[] => {
  const seen = new Set<string>()
  const results: string[] = []

  for (const value of values) {
    if (!value) continue
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    results.push(trimmed)
  }

  return results
}

const buildHeaders = (apiKey: string, headerStrategy: HeaderStrategy, bodyStrategy: BodyStrategy): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (headerStrategy === 'authorization') {
    headers.Authorization = apiKey
  } else if (headerStrategy === 'bearer') {
    headers.Authorization = `Bearer ${apiKey}`
  } else {
    headers['x-api-key'] = apiKey
  }

  return headers
}

const buildBody = (isbns: string[], bodyStrategy: BodyStrategy): string => JSON.stringify({ isbns })

const postBatchRequest = (
  endpoint: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number,
): Promise<{ statusCode: number; body: string }> =>
  new Promise((resolve, reject) => {
    const url = new URL(endpoint)
    const req = httpsRequest(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': String(Buffer.byteLength(body)),
        },
      },
      (response) => {
        let responseBody = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          responseBody += chunk
        })
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode || 0,
            body: responseBody,
          })
        })
      },
    )

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timed out after ${timeoutMs}ms`))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })

const parseBatchResponse = (body: string): Map<string, ISBNdbBatchBook> => {
  const resultMap = new Map<string, ISBNdbBatchBook>()
  const data = JSON.parse(body) as { data?: ISBNdbBatchBook[] }

  for (const book of data.data || []) {
    const isbn = typeof book.isbn13 === 'string' && book.isbn13.trim()
      ? book.isbn13.trim()
      : typeof book.isbn === 'string'
        ? book.isbn.trim()
        : ''

    if (isbn) {
      resultMap.set(isbn, book)
    }
  }

  return resultMap
}

export async function fetchISBNdbBatchBooks(
  isbns: string[],
  options: FetchISBNdbBatchOptions,
): Promise<Map<string, ISBNdbBatchBook>> {
  const { apiKey, logger, timeoutMs = 60000 } = options
  const resultMap = new Map<string, ISBNdbBatchBook>()

  if (!apiKey || isbns.length === 0) return resultMap

  const endpoints = unique([
    process.env.ISBNDB_BATCH_URL,
    process.env.ISBNDB_BULK_URL,
    ...(options.endpoints || []),
    ...DEFAULT_ENDPOINTS,
  ])

  const attempts: BatchConfig[] = []
  if (cachedBatchConfig) {
    attempts.push(cachedBatchConfig)
  }

  for (const endpoint of endpoints) {
    for (const headerStrategy of HEADER_STRATEGIES) {
      for (const bodyStrategy of BODY_STRATEGIES) {
        const config: BatchConfig = { endpoint, headerStrategy, bodyStrategy }
        const isCached =
          cachedBatchConfig &&
          cachedBatchConfig.endpoint === endpoint &&
          cachedBatchConfig.headerStrategy === headerStrategy &&
          cachedBatchConfig.bodyStrategy === bodyStrategy

        if (!isCached) {
          attempts.push(config)
        }
      }
    }
  }

  for (const attempt of attempts) {
    try {
      const response = await postBatchRequest(
        attempt.endpoint,
        buildHeaders(apiKey, attempt.headerStrategy, attempt.bodyStrategy),
        buildBody(isbns, attempt.bodyStrategy),
        timeoutMs,
      )

      if (response.statusCode < 200 || response.statusCode >= 300) {
        continue
      }

      cachedBatchConfig = attempt
      if (logger) {
        logger(
          `ISBNdb batch endpoint resolved: ${attempt.endpoint} (${attempt.headerStrategy}, ${attempt.bodyStrategy})`,
        )
      }
      return parseBatchResponse(response.body)
    } catch {
      continue
    }
  }

  if (logger) {
    logger('WARN ISBNdb batch lookup failed for all known endpoint/auth combinations')
  }

  return resultMap
}
