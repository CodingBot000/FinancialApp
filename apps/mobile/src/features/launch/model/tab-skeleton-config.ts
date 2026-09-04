export const FIRST_VISIT_SKELETON_DURATION_MS = 550;

export const FIRST_VISIT_SKELETON_TABS = [
  'index',
  'market',
  'coach',
  'order',
] as const;

export type FirstVisitSkeletonTab = (typeof FIRST_VISIT_SKELETON_TABS)[number];

export function isFirstVisitSkeletonTab(
  routeName: string,
): routeName is FirstVisitSkeletonTab {
  return FIRST_VISIT_SKELETON_TABS.some((tabName) => tabName === routeName);
}
