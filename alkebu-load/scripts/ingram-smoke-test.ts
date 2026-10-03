#!/usr/bin/env tsx
/**
 * Ingram connectivity smoke test — checks that our credentials work against the
 * production Web Service and SFTP server.
 *
 * Deliberately prints only pass/fail signals (HTTP status, element counts, folder
 * names, error text) — never Ingram product data (Ingram agreement §2(c)).
 *
 * Usage (from alkebu-load/):
 *   tsx scripts/ingram-smoke-test.ts            # both checks
 *   tsx scripts/ingram-smoke-test.ts ws         # Web Service login check only
 *   tsx scripts/ingram-smoke-test.ts stock [isbn]  # one Query Type 9 stock lookup (shape only)
 *   tsx scripts/ingram-smoke-test.ts sftp       # SFTP only
 *   tsx scripts/ingram-smoke-test.ts ops        # Web Service operation names (from the WSDL)
 *   tsx scripts/ingram-smoke-test.ts schema     # request field names for the header + operations
 *   tsx scripts/ingram-smoke-test.ts csvheader  # Catalog Stock CSV column names (header row only)
 */

import dotenv from 'dotenv'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

dotenv.config({ path: './.env' })

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set in alkebu-load/.env`)
  return value
}

function firstElementText(xml: string, names: string[]): string | null {
  for (const name of names) {
    const match = xml.match(new RegExp(`<(?:\\w+:)?${name}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`))
    if (match) return match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
  }
  return null
}

const COMPANION_NS = 'http://ingrambook.com/CompDataAccess/companion'

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** SOAP 1.1 call with the UserInfo credentials header the WSDL declares. */
async function soapCall(action: string, bodyXml: string): Promise<{ status: number; text: string; ms: number }> {
  const url = requireEnv('INGRAM_WS_URL')
  const user = requireEnv('INGRAM_WS_USER')
  const password = requireEnv('INGRAM_WS_PASSWORD')
  const envelope =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
    `<soap:Header><UserInfo xmlns="${COMPANION_NS}">` +
    `<UserName>${xmlEscape(user)}</UserName><Password>${xmlEscape(password)}</Password>` +
    '</UserInfo></soap:Header>' +
    `<soap:Body>${bodyXml}</soap:Body></soap:Envelope>`
  const started = Date.now()
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"${COMPANION_NS}/${action}"` },
    body: envelope,
    signal: AbortSignal.timeout(20_000),
  })
  return { status: response.status, text: await response.text(), ms: Date.now() - started }
}

/** Credential check via testLogin — returns an int, requests no title data. */
async function checkWebService(): Promise<boolean> {
  console.log(`\n[ws] SOAP testLogin -> ${requireEnv('INGRAM_WS_URL')}`)
  let result: { status: number; text: string; ms: number }
  try {
    result = await soapCall('testLogin', `<testLogin xmlns="${COMPANION_NS}" />`)
  } catch (error) {
    console.log(`[ws] FAIL  request error: ${(error as Error).message}`)
    return false
  }
  const loginResult = firstElementText(result.text, ['testLoginResult'])
  const fault = firstElementText(result.text, ['faultstring', 'Reason'])
  console.log(`[ws] HTTP ${result.status} in ${result.ms} ms`)
  console.log(`[ws] testLoginResult: ${loginResult ?? '(missing)'}`)
  if (fault) console.log(`[ws] fault: ${fault}`)
  const ok = result.status === 200 && loginResult !== null && !fault
  console.log(`[ws] ${ok ? 'PASS (check what the result code means in the guide)' : 'FAIL'}`)
  return ok
}

// A title from our own catalog; override with the second CLI arg.
const DEFAULT_ISBN = '9781626566743'

function xmlUnescape(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/**
 * One Query Type 9 (ISBN) stock lookup via SearchRequestTypes12349Enhanced.
 * Reports response *shape* only — element counts and tag names, never values —
 * so the parser can be written without anyone handling the title data.
 */
async function checkStockLookup(isbn: string): Promise<boolean> {
  if (!/^\d{13}$/.test(isbn)) throw new Error(`Expected a 13-digit ISBN, got "${isbn}"`)
  console.log(`\n[stock] SOAP SearchRequestTypes12349Enhanced  queryType=9, dataRequest=STK, 1 ISBN`)
  const body =
    `<SearchRequestTypes12349Enhanced xmlns="${COMPANION_NS}">` +
    '<queryType>9</queryType>' +
    `<query>${xmlEscape(`BN="${isbn}"`)}</query>` +
    '<startRecord>1</startRecord><endRecord>1</endRecord>' +
    '<sortField></sortField><liveUpdate>Y</liveUpdate><dataRequest>STK</dataRequest>' +
    '</SearchRequestTypes12349Enhanced>'

  let result: { status: number; text: string; ms: number }
  try {
    result = await soapCall('SearchRequestTypes12349Enhanced', body)
  } catch (error) {
    console.log(`[stock] FAIL  request error: ${(error as Error).message}`)
    return false
  }

  const fault = firstElementText(result.text, ['faultstring', 'Reason'])
  // ASMX often returns the payload as an escaped XML string inside <...Result>.
  const escaped = /&lt;\w/.test(result.text)
  const payload = escaped ? xmlUnescape(result.text) : result.text
  const tags = [...new Set([...payload.matchAll(/<(?:\w+:)?([A-Za-z_][\w.-]*)[\s>/]/g)].map((m) => m[1]))]
  const count = (name: string) => (payload.match(new RegExp(`<(?:\\w+:)?${name}[\\s>/]`, 'g')) || []).length

  console.log(`[stock] HTTP ${result.status} in ${result.ms} ms, ${result.text.length} bytes`)
  console.log(`[stock] payload embedded as escaped XML string: ${escaped ? 'yes' : 'no'}`)
  console.log(`[stock] <Product>: ${count('Product')}, <Stock>: ${count('Stock')}, <OnHand>: ${count('OnHand')}`)
  console.log(`[stock] distinct tag names (${tags.length}): ${tags.join(', ')}`)
  // Server status text (not title data) — explains empty or partial results.
  const searchMessage = firstElementText(payload, ['SearchMessage'])
  if (searchMessage) console.log(`[stock] SearchMessage: ${searchMessage}`)
  if (fault) console.log(`[stock] fault: ${fault}`)

  const reached = result.status === 200 && !fault && count('Product') > 0
  const hasStock = count('Stock') > 0
  console.log(`[stock] ${reached && hasStock ? 'PASS' : reached ? 'PARTIAL — product returned without a <Stock> section' : 'FAIL'}`)
  const ok = reached && hasStock
  return ok
}

/** Lists the operation names in the service WSDL — the interface, not data. */
async function listOperations(): Promise<boolean> {
  const url = requireEnv('INGRAM_WS_URL')
  console.log(`\n[ops] GET ${url}?WSDL`)
  try {
    const response = await fetch(`${url}?WSDL`, { signal: AbortSignal.timeout(20_000) })
    const wsdl = await response.text()
    const portTypes = wsdl.match(/<(?:\w+:)?portType[\s\S]*?<\/(?:\w+:)?portType>/g) || []
    const operations = new Set<string>()
    for (const portType of portTypes) {
      for (const match of portType.matchAll(/<(?:\w+:)?operation\s+name="([^"]+)"/g)) operations.add(match[1])
    }
    const bindings = [...wsdl.matchAll(/<(?:\w+:)?binding\s+name="([^"]+)"/g)].map((m) => m[1])
    console.log(`[ops] HTTP ${response.status}; bindings: ${bindings.join(', ') || '(none)'}`)
    console.log(`[ops] operations: ${[...operations].join(', ') || '(none)'}`)
    for (const op of operations) {
      const message = wsdl.match(
        new RegExp(`<(?:\\w+:)?message\\s+name="${op}HttpPostIn"[\\s\\S]*?</(?:\\w+:)?message>`),
      )
      const params = message ? [...message[0].matchAll(/<(?:\w+:)?part\s+name="([^"]+)"/g)].map((m) => m[1]) : []
      console.log(`[ops]   POST ${url}/${op}  params: ${params.join(', ') || '(none listed)'}`)
    }
    const headers = [...wsdl.matchAll(/<(?:\w+:)?header\s+message="[^"]*"\s+part="([^"]+)"/g)].map((m) => m[1])
    if (headers.length) console.log(`[ops] SOAP header parts: ${[...new Set(headers)].join(', ')}`)
    return response.ok && operations.size > 0
  } catch (error) {
    console.log(`[ops] FAIL  request error: ${(error as Error).message}`)
    return false
  }
}

/** Prints the WSDL schema field names (name:type) for the request elements we need. */
async function printSchema(): Promise<boolean> {
  const url = requireEnv('INGRAM_WS_URL')
  const response = await fetch(`${url}?WSDL`, { signal: AbortSignal.timeout(20_000) })
  const wsdl = await response.text()
  console.log(`\n[schema] GET ${url}?WSDL -> HTTP ${response.status}`)
  const targetNamespace = wsdl.match(/targetNamespace="([^"]+)"/)?.[1]
  console.log(`[schema] targetNamespace: ${targetNamespace ?? '(none)'}`)

  const seen = new Set<string>()
  const describe = (kind: 'element' | 'complexType', name: string, depth: number) => {
    const key = `${kind}:${name}`
    if (seen.has(key) || depth > 4) return
    seen.add(key)
    const block = wsdl.match(
      new RegExp(`<(?:\\w+:)?${kind}\\s+name="${name}"[^>]*?(?:/>|>[\\s\\S]*?</(?:\\w+:)?${kind}>)`),
    )?.[0]
    if (!block) return
    const ownType = block.match(/^<[^>]*\stype="(?:\w+:)?([^"]+)"/)?.[1]
    const children = [...block.matchAll(/<(?:\w+:)?element\s+([^>]*?)\/?>/g)]
      .slice(kind === 'element' ? 1 : 0)
      .map((m) => {
        const attrs = m[1]
        const childName = attrs.match(/name="([^"]+)"/)?.[1] ?? attrs.match(/ref="(?:\w+:)?([^"]+)"/)?.[1] ?? '?'
        const childType = attrs.match(/type="(?:\w+:)?([^"]+)"/)?.[1] ?? '(inline)'
        const max = attrs.match(/maxOccurs="([^"]+)"/)?.[1]
        return { childName, childType, max }
      })
    const pad = '  '.repeat(depth)
    console.log(`[schema] ${pad}${kind} ${name}${ownType ? ` : ${ownType}` : ''}`)
    for (const child of children) {
      console.log(`[schema] ${pad}  - ${child.childName}: ${child.childType}${child.max === 'unbounded' ? '[]' : ''}`)
    }
    const nested = [ownType, ...children.map((c) => c.childType)].filter(
      (t): t is string => !!t && !/^(string|int|boolean|dateTime|decimal|long|short|base64Binary|anyType|\(inline\))$/.test(t),
    )
    for (const typeName of nested) describe('complexType', typeName, depth + 1)
  }

  describe('element', 'UserInfo', 0)
  for (const m of wsdl.matchAll(/<(?:\w+:)?message\s+name="(\w+)SoapIn">[\s\S]*?element="(?:\w+:)?([^"]+)"/g)) {
    console.log(`[schema] -- operation ${m[1]} (input element ${m[2]})`)
    describe('element', m[2], 0)
  }
  const soapActions = [...wsdl.matchAll(/soapAction="([^"]+)"/g)].map((m) => m[1])
  console.log(`[schema] soapActions: ${[...new Set(soapActions)].join(', ')}`)
  return response.ok
}

/**
 * Runs a batch of sftp commands. Uses OpenSSH's sftp: curl's libssh2 can't negotiate
 * Ingram's key exchange. The password reaches ssh through a throwaway SSH_ASKPASS
 * helper that reads it from the child's environment, so it never appears in argv or
 * on disk.
 */
async function runSftp(commands: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const host = requireEnv('INGRAM_FTP_HOST')
  const user = requireEnv('INGRAM_FTP_USER')
  const password = requireEnv('INGRAM_FTP_PASSWORD')
  const dir = await mkdtemp(join(tmpdir(), 'ingram-askpass-'))
  const askpass = join(dir, 'askpass.sh')
  await writeFile(askpass, '#!/bin/sh\nprintf \'%s\\n\' "$INGRAM_SFTP_ASKPASS_VALUE"\n', { mode: 0o700 })

  try {
    const sftp = spawn(
      'sftp',
      [
        '-o', 'StrictHostKeyChecking=accept-new',
        '-o', 'PreferredAuthentications=password,keyboard-interactive',
        '-o', 'PubkeyAuthentication=no',
        '-o', 'NumberOfPasswordPrompts=1',
        '-o', 'ConnectTimeout=20',
        `${user}@${host}`,
      ],
      {
        env: {
          ...process.env,
          SSH_ASKPASS: askpass,
          SSH_ASKPASS_REQUIRE: 'force',
          DISPLAY: process.env.DISPLAY || ':0',
          INGRAM_SFTP_ASKPASS_VALUE: password,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )
    sftp.stdin.end([...commands, 'bye'].join('\n') + '\n')

    let stdout = ''
    let stderr = ''
    sftp.stdout.on('data', (chunk) => (stdout += chunk))
    sftp.stderr.on('data', (chunk) => (stderr += chunk))
    const code: number = await new Promise((resolve) => sftp.on('close', resolve))
    return { code, stdout, stderr }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

const sftpOutputLines = (stdout: string) =>
  stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('sftp>'))

async function checkSftp(): Promise<boolean> {
  console.log(`\n[sftp] sftp ${requireEnv('INGRAM_FTP_USER')}@${requireEnv('INGRAM_FTP_HOST')}  (top-level folder names only)`)
  const { code, stdout, stderr } = await runSftp(['ls -1'])
  if (code !== 0) {
    console.log(`[sftp] FAIL  sftp exit ${code}: ${stderr.trim()}`)
    return false
  }
  const entries = sftpOutputLines(stdout).filter((line) => !line.startsWith('.'))
  console.log(`[sftp] logged in; ${entries.length} top-level entries: ${entries.join(', ')}`)
  console.log('[sftp] PASS')
  return true
}

/** First line of the first entry in a zip, read as a stream (never the whole file). */
async function firstLineOfZip(zipPath: string): Promise<string> {
  const unzip = spawn('unzip', ['-p', zipPath], { stdio: ['ignore', 'pipe', 'pipe'] })
  return new Promise((resolve, reject) => {
    let buffer = ''
    unzip.stdout.on('data', (chunk) => {
      buffer += chunk
      const newline = buffer.indexOf('\n')
      if (newline !== -1) {
        unzip.kill()
        resolve(buffer.slice(0, newline).replace(/\r$/, ''))
      }
    })
    unzip.on('error', reject)
    unzip.on('close', () => resolve(buffer.replace(/\r$/, '')))
  })
}

/**
 * Answers "does the Catalog Stock CSV carry the Product Availability Code?" from the
 * CSV header row: column names only, never data. Downloads the smallest catalog-stock
 * zip, reads its first line, and deletes the download.
 */
async function printCatalogStockHeader(): Promise<boolean> {
  const folder = process.env.INGRAM_CATALOG_STOCK_DIR || 'Inventory/Catalog_Stock'
  console.log(`\n[csv] listing ${folder}/ (file names and sizes only)`)
  const listing = await runSftp([`ls -l ${folder}`])
  if (listing.code !== 0) {
    console.log(`[csv] FAIL  sftp exit ${listing.code}: ${listing.stderr.trim()}`)
    return false
  }
  const files = sftpOutputLines(listing.stdout)
    .map((line) => line.split(/\s+/))
    .filter((cols) => cols.length >= 9 && /^-/.test(cols[0]))
    .map((cols) => ({ size: Number(cols[4]), name: cols.slice(8).join(' ') }))
  const zips = files.filter((f) => /^cat_ing_stock.*\.zip$/i.test(f.name)).sort((a, b) => a.size - b.size)
  console.log(`[csv] ${files.length} files; catalog-stock zips: ${zips.map((f) => `${f.name} (${f.size} B)`).join(', ') || '(none)'}`)
  const smallest = zips[0]
  if (!smallest) {
    console.log('[csv] FAIL  no cat_ing_stock*.zip found; set INGRAM_CATALOG_STOCK_DIR if the folder differs')
    return false
  }

  const dir = await mkdtemp(join(tmpdir(), 'ingram-csv-'))
  try {
    const local = join(dir, 'catalog-stock.zip')
    console.log(`[csv] downloading ${smallest.name} to a temp dir (deleted afterwards)`)
    const download = await runSftp([`get "${folder}/${smallest.name}" "${local}"`])
    if (download.code !== 0) {
      console.log(`[csv] FAIL  download exit ${download.code}: ${download.stderr.trim()}`)
      return false
    }
    const header = await firstLineOfZip(local)
    const columns = header.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    // A 13-digit run means the first line is a data row: report its shape, not its values.
    if (/\d{13}/.test(header)) {
      console.log(`[csv] first line is data, not a header: ${columns.length} columns. Check Specs_Stock_Catalog.pdf instead.`)
      return false
    }
    console.log(`[csv] ${columns.length} columns: ${columns.join(' | ')}`)
    const availability = columns.filter((c) => /avail|prodstat|status/i.test(c))
    console.log(`[csv] availability-like columns: ${availability.join(', ') || '(none)'}`)
    return true
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function main() {
  const [mode = 'all', isbn = DEFAULT_ISBN] = process.argv.slice(2)
  const results: boolean[] = []
  if (mode === 'all' || mode === 'ws') results.push(await checkWebService())
  if (mode === 'all' || mode === 'sftp') results.push(await checkSftp())
  if (mode === 'all' || mode === 'stock') results.push(await checkStockLookup(isbn))
  if (mode === 'ops') results.push(await listOperations())
  if (mode === 'schema') results.push(await printSchema())
  if (mode === 'csvheader') results.push(await printCatalogStockHeader())
  process.exitCode = results.every(Boolean) ? 0 : 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
