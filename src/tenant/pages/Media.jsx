import { PageHeader } from "../../shared/ui/index.js";
import MediaLibrary from "../../shared/components/MediaLibrary.jsx";

export default function Media() {
  return (
    <>
      <PageHeader
        title="Media"
        description="Images and documents used by your products, categories, brands and store branding."
        breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Media" }]}
      />
      <MediaLibrary />
    </>
  );
}
