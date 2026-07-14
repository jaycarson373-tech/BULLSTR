import { AirdropHistory, HowItWorksSection, LiveProtocolDashboard, ProtocolTopStrip, RecentAirdrops } from "../home-strategy-data";
import { SiteNav } from "../site-nav";

export default function DashboardPage() {
  return (
    <div className="page hyperhood-page">
      <SiteNav />
      <main className="subpage-main dashboard-main">
        <ProtocolTopStrip />
        <HowItWorksSection />
        <LiveProtocolDashboard />
        <RecentAirdrops />
        <AirdropHistory />
      </main>
    </div>
  );
}
