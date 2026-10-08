import SupportInbox from "../../shared/components/SupportInbox.jsx";

export default function Support() {
  return (
    <SupportInbox
      title="Support"
      subtitle="Conversations with your buyers. Reply, add internal notes, assign to teammates, escalate or close."
      breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Support" }]}
      orderHref={(id) => `/tenant/orders/${id}`}
    />
  );
}
