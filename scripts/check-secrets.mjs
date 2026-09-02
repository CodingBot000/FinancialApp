import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = process.cwd();
const ignoredDirectories = new Set([
  '.expo',
  '.git',
  '.idea',
  '.vscode',
  'coverage',
  'dist',
  'docs',
  'node_modules',
]);
const ignoredFiles = new Set(['package-lock.json']);
const scannableExtensions = new Set([
  '.cjs',
  '.env',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.toml',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);
const allowedPlaceholder =
  /^(?:<|\$\{|change[-_]?me|example|replace[-_]?me|your[-_])/i;
const detectors = [
  {
    name: 'private key',
    pattern: /-----BEGIN (?:EC |OPENSSH |PGP |RSA )?PRIVATE KEY-----/g,
  },
  {
    name: 'AWS access key',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    name: 'credential literal',
    pattern:
      /(?:password|passwd|client[_-]?secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["']([^"']+)["']/gi,
    valueGroup: 1,
  },
  {
    name: 'database URL password',
    pattern: /postgres(?:ql)?:\/\/[^\s:@/]+:([^\s@/]+)@/gi,
    valueGroup: 1,
  },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await collectFiles(absolutePath)));
      }
      continue;
    }

    const extension = path.extname(entry.name);
    const isEnvironmentFile =
      entry.name === '.env.example' || entry.name === '.env.local';
    if (
      !ignoredFiles.has(entry.name) &&
      (isEnvironmentFile || scannableExtensions.has(extension))
    ) {
      files.push(absolutePath);
    }
  }

  return files;
}

const findings = [];
for (const file of await collectFiles(repositoryRoot)) {
  const content = await readFile(file, 'utf8');

  for (const detector of detectors) {
    detector.pattern.lastIndex = 0;
    for (const match of content.matchAll(detector.pattern)) {
      const value = detector.valueGroup
        ? match[detector.valueGroup]
        : undefined;
      if (value && allowedPlaceholder.test(value)) {
        continue;
      }

      const line = content.slice(0, match.index).split('\n').length;
      findings.push(
        `${path.relative(repositoryRoot, file)}:${line} (${detector.name})`,
      );
    }
  }
}

if (findings.length > 0) {
  console.error('Potential committed secrets detected:');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exitCode = 1;
} else {
  console.log('Secret scan passed.');
}
