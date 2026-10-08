import AnalyticsDashboard from "../../shared/components/AnalyticsDashboard.jsx";

export default function Analytics() {
  return (
    <AnalyticsDashboard
      title="Analytics"
      subtitle="Revenue and tracked events across the marketplace. Pick a tenant to focus on one store."
      breadcrumbs={[{ label: "Platform", to: "/super-admin" }, { label: "Analytics" }]}
      showTenants
    />
  );
}
