import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';

import type { FirstVisitSkeletonTab } from './tab-skeleton-config';

interface TabSkeletonSession {
  readonly hasVisited: (tabName: FirstVisitSkeletonTab) => boolean;
  readonly markVisited: (tabName: FirstVisitSkeletonTab) => void;
}

const TabSkeletonSessionContext = createContext<TabSkeletonSession | undefined>(
  undefined,
);

export function TabSkeletonSessionProvider({ children }: PropsWithChildren) {
  const visitedTabs = useRef(new Set<FirstVisitSkeletonTab>());
  const hasVisited = useCallback(
    (tabName: FirstVisitSkeletonTab) => visitedTabs.current.has(tabName),
    [],
  );
  const markVisited = useCallback((tabName: FirstVisitSkeletonTab) => {
    visitedTabs.current.add(tabName);
  }, []);
  const session = useMemo(
    () => ({ hasVisited, markVisited }),
    [hasVisited, markVisited],
  );

  return (
    <TabSkeletonSessionContext.Provider value={session}>
      {children}
    </TabSkeletonSessionContext.Provider>
  );
}

export function useTabSkeletonSession() {
  const session = useContext(TabSkeletonSessionContext);
  if (session === undefined) {
    throw new Error(
      'useTabSkeletonSession must be used inside TabSkeletonSessionProvider.',
    );
  }
  return session;
}
