import { useTabContext } from "@/contexts/TabContext";

/**
 * Convenience hook for opening tabs from anywhere in the app.
 * Usage: const { openTab } = useTabNavigation();
 *        openTab("/pipeline-leads");
 */
export function useTabNavigation() {
  const { openTab, closeTab, activateTab } = useTabContext();
  return { openTab, closeTab, activateTab };
}
