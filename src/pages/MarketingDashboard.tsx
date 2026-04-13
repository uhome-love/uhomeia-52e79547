import MarketingDashboard from "@/components/marketing/MarketingDashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { TrendingUp } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="bg-[#f0f0f5] dark:bg-[#0e1525] p-6 -m-6 min-h-full">
      <PageHeader
        title="Central de Marketing"
        subtitle="Performance de anúncios, campanhas e resultados Meta Ads"
        icon={<TrendingUp size={18} strokeWidth={1.5} />}
      />
      <MarketingDashboard />
    </div>
  );
}
