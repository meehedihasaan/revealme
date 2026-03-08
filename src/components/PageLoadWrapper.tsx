import { usePageLoader } from "@/hooks/usePageLoader";
import PageLoader from "@/components/PageLoader";

const PageLoadWrapper = ({ children }: { children: React.ReactNode }) => {
  const loading = usePageLoader(2000);
  if (loading) return <PageLoader />;
  return <>{children}</>;
};

export default PageLoadWrapper;
