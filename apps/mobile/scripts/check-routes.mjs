import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const routeFiles = [
  'src/app/_layout.tsx',
  'src/app/index.tsx',
  'src/app/order.tsx',
  'src/app/market/[symbol].tsx',
  'src/app/notifications.tsx',
  'src/app/my-info-management.tsx',
  'src/app/notification-settings.tsx',
  'src/app/(tabs)/_layout.tsx',
  'src/app/(tabs)/index.tsx',
  'src/app/(tabs)/market.tsx',
  'src/app/(tabs)/order.tsx',
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
for (const label of ['홈', '종목', '주문', '플랜', '내 정보']) {
  if (!tabsLayout.includes(`title: '${label}'`)) {
    throw new Error(`필수 bottom tab label이 없습니다: ${label}`);
  }
}

for (const icon of [
  'home-outline',
  'stats-chart-outline',
  'receipt-outline',
  'analytics-outline',
  'person-circle-outline',
]) {
  if (!tabsLayout.includes(`'${icon}'`)) {
    throw new Error(`필수 bottom tab icon이 없습니다: ${icon}`);
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
