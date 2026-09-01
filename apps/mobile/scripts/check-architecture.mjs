import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const sourceRoot = path.join(mobileRoot, 'src');
const sourceExtensions = new Set(['.ts', '.tsx']);
const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

async function collectSourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolutePath)));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function resolveSourceImport(sourceFile, specifier) {
  if (!specifier.startsWith('.')) {
    return undefined;
  }

  const unresolved = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [
    unresolved,
    `${unresolved}.ts`,
    `${unresolved}.tsx`,
    path.join(unresolved, 'index.ts'),
    path.join(unresolved, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    } catch {
      // The next candidate may resolve the import.
    }
  }

  return undefined;
}

function relativeSourcePath(file) {
  return path.relative(sourceRoot, file).split(path.sep).join('/');
}

function featureName(relativePath) {
  const match = /^features\/([^/]+)\//.exec(relativePath);
  return match?.[1];
}

function validateBoundary(sourceFile, targetFile) {
  const source = relativeSourcePath(sourceFile);
  const target = relativeSourcePath(targetFile);
  const violations = [];

  if (source.startsWith('shared/') && /^(?:app|features)\//.test(target)) {
    violations.push('shared must not import app or features');
  }

  const sourceFeature = featureName(source);
  const targetFeature = featureName(target);
  if (
    sourceFeature !== undefined &&
    targetFeature !== undefined &&
    sourceFeature !== targetFeature
  ) {
    violations.push('features must not import another feature directly');
  }

  if (source.startsWith('app/') && targetFeature !== undefined) {
    const publicEntry = `features/${targetFeature}/index.ts`;
    const publicEntryTsx = `features/${targetFeature}/index.tsx`;
    if (target !== publicEntry && target !== publicEntryTsx) {
      violations.push('routes must import features through their public index');
    }
  }

  if (
    source.startsWith('app/') &&
    target.startsWith('shared/api/') &&
    target !== 'shared/api/index.ts' &&
    target !== 'shared/api/index.tsx'
  ) {
    violations.push('routes must not import API transport internals');
  }

  return violations.map((message) => `${source} -> ${target}: ${message}`);
}

function findCycles(graph) {
  const visited = new Set();
  const visiting = new Set();
  const stack = [];
  const cycles = [];

  function visit(node) {
    if (visiting.has(node)) {
      const cycleStart = stack.indexOf(node);
      cycles.push([...stack.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) {
      return;
    }

    visiting.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) {
      visit(dependency);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) {
    visit(node);
  }

  return cycles;
}

const files = await collectSourceFiles(sourceRoot);
const graph = new Map(files.map((file) => [file, []]));
const violations = [];

for (const file of files) {
  const source = await fs.readFile(file, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2];
    if (specifier === undefined) {
      continue;
    }

    const target = await resolveSourceImport(file, specifier);
    if (target === undefined || !target.startsWith(sourceRoot)) {
      continue;
    }

    graph.get(file)?.push(target);
    violations.push(...validateBoundary(file, target));
  }
}

for (const cycle of findCycles(graph)) {
  violations.push(
    `import cycle: ${cycle.map(relativeSourcePath).join(' -> ')}`,
  );
}

if (violations.length > 0) {
  process.stderr.write(
    `Mobile architecture check failed:\n${violations.join('\n')}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Mobile architecture check passed for ${files.length} source files.\n`,
  );
}
