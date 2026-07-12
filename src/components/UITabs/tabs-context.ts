import { createContext, useContext } from 'react';

export interface TabsContextValue {
  activeTab: string;
  onTabChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('UITabs sub-components must be used inside <UITabs>');
  return ctx;
}

export default TabsContext;
