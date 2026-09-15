import AnalyticsDashboard from "../../shared/components/AnalyticsDashboard.jsx";

export default function Analytics() {
  return (
    <AnalyticsDashboard
      title="Platform analytics"
      subtitle="Date-wise events, volume, and important activity across tenants."
      showTenants
    />
  );
}
