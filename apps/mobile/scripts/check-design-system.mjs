import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const sourceRoot = new URL('../src/', import.meta.url).pathname;
const hexPattern = /#[0-9a-f]{3,8}\b/gi;
const forbiddenCopy = [
  '샌드박스',
  '데이터셋',
  '테스트 데이터',
  'PKCE',
  'OIDC',
  'SecureStore',
  '접근 토큰',
  '갱신 토큰',
  '개발자 도구',
  '시나리오',
  '계산 엔진',
  '자동 재시도',
  '기술 데모',
  '플랫폼 상태',
  'MFA',
  'synthetic',
];

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(path);
    if (
      !entry.isFile() ||
      !entry.name.endsWith('.tsx') ||
      entry.name.includes('.test.')
    )
      return [];
    return [path];
  });
}

const files = [
  ...filesIn(join(sourceRoot, 'app')),
  ...filesIn(join(sourceRoot, 'features')).filter((file) =>
    file.includes('/ui/'),
  ),
];
const violations = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(hexPattern)) {
    violations.push(`${relative(sourceRoot, file)} raw color ${match[0]}`);
  }
  for (const term of forbiddenCopy) {
    if (source.includes(term))
      violations.push(
        `${relative(sourceRoot, file)} forbidden customer copy: ${term}`,
      );
  }
}

if (violations.length > 0) {
  console.error('Design-system check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Design-system check passed (${files.length} UI files).`);
}
