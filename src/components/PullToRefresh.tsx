import { ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh?: () => Promise<void>;
  children: ReactNode;
}

// Pull-to-refresh disabled — users refresh via the browser reload button.
const PullToRefresh = ({ children }: PullToRefreshProps) => {
  return <>{children}</>;
};

export default PullToRefresh;
