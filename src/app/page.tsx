import Catalog from "@/components/Catalog";
import { getCatalog } from "@/lib/data";

export default async function Home() {
  const { business, sneakers, demo } = await getCatalog();
  return <Catalog business={business} sneakers={sneakers} demo={demo} />;
}
