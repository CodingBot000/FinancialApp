import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const routeFiles = [
  'src/app/_layout.tsx',
  'src/app/index.tsx',
  'src/app/order.tsx',
  'src/app/market/[symbol].tsx',
  'src/app/(tabs)/_layout.tsx',
  'src/app/(tabs)/index.tsx',
  'src/app/(tabs)/market.tsx',
  'src/app/(tabs)/plan.tsx',
  'src/app/(tabs)/me.tsx',
];

for (const file of routeFiles) {
  try {
    await access(join(appRoot, file));
  } catch {
    throw new Error(`필수 route 파일이 없습니다: ${file}`);
  }
}

const tabsLayout = await readFile(
  join(appRoot, 'src/app/(tabs)/_layout.tsx'),
  'utf8',
);
for (const label of ['홈', '종목', '플랜', '내 정보']) {
  if (!tabsLayout.includes(`title: '${label}'`)) {
    throw new Error(`필수 bottom tab label이 없습니다: ${label}`);
  }
}

const appJson = JSON.parse(await readFile(join(appRoot, 'app.json'), 'utf8'));
if (appJson.expo?.name !== 'Wealth Flow') {
  throw new Error('app 표시 이름은 Wealth Flow여야 합니다.');
}
if (appJson.expo?.userInterfaceStyle !== 'light') {
  throw new Error('app userInterfaceStyle은 light여야 합니다.');
}

console.log(`Route smoke check passed (${routeFiles.length} route files).`);
