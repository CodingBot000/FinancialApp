import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';

import type { MarketInstrumentInput } from '../../domain/market-model.js';

const MASTER_FILES = [
  {
    market: 'KOSPI' as const,
    url: 'https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip',
    fileName: 'kospi_code.mst',
    tailLength: 228,
  },
  {
    market: 'KOSDAQ' as const,
    url: 'https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip',
    fileName: 'kosdaq_code.mst',
    tailLength: 222,
  },
] as const;

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function fetchKisStockMaster(
  fetcher: FetchLike = globalThis.fetch,
): Promise<readonly MarketInstrumentInput[]> {
  const instruments: MarketInstrumentInput[] = [];
  for (const definition of MASTER_FILES) {
    let response: Response;
    try {
      response = await fetcher(definition.url, {
        signal: AbortSignal.timeout(15_000),
      });
    } catch (cause) {
      throw new Error(`KIS ${definition.market} master request failed.`, {
        cause,
      });
    }
    if (!response.ok) {
      throw new Error(
        `KIS ${definition.market} master returned HTTP ${response.status}.`,
      );
    }
    const rows = parseKisMasterZip(
      Buffer.from(await response.arrayBuffer()),
      definition.fileName,
      definition.market,
      definition.tailLength,
    );
    instruments.push(...rows);
  }
  return instruments;
}

export function parseKisMasterZip(
  archive: Buffer,
  fileName: string,
  market: 'KOSPI' | 'KOSDAQ',
  tailLength: number,
): readonly MarketInstrumentInput[] {
  const entry = new AdmZip(archive).getEntry(fileName);
  if (entry === null) {
    throw new Error(`KIS ${market} master file is missing from the archive.`);
  }
  return parseKisMasterText(
    iconv.decode(entry.getData(), 'euc-kr'),
    market,
    tailLength,
  );
}

export function parseKisMasterText(
  text: string,
  market: 'KOSPI' | 'KOSDAQ',
  tailLength: number,
): readonly MarketInstrumentInput[] {
  return text
    .split(/\r?\n/)
    .map((line, index): MarketInstrumentInput | undefined => {
      if (!line.trim() || line.length <= tailLength + 21) return undefined;
      const head = line.slice(0, line.length - tailLength);
      const symbol = head.slice(0, 9).trim();
      const standardCode = head.slice(9, 21).trim();
      const name = head.slice(21).trim();
      if (!/^\d{6}$/.test(symbol) || name.length === 0) return undefined;
      return {
        symbol,
        name,
        market,
        standardCode: standardCode || null,
        source: 'KIS_MASTER' as const,
        raw: {
          source: 'KIS_MASTER',
          market,
          lineNumber: index + 1,
        },
      } satisfies MarketInstrumentInput;
    })
    .filter((row): row is MarketInstrumentInput => row !== undefined);
}
