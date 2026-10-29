import type { ReactNode } from 'react';

type TabItemProps = {
  isTabItem?: boolean;
  children?: ReactNode;
};

// Tabs.Root が child.type で TabItem を識別し、Tab / Panel を取り出す。
export default function TabItem({ isTabItem = true, children }: TabItemProps) {
  void isTabItem;
  return <div>{children}</div>;
}
