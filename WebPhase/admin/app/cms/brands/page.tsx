import { redirect } from "next/navigation";

/**
 * Brands is a record with a page of its own, so it lives at /brands. The CMS arranges
 * what a page shows; it does not hold records. This address is kept so an older link
 * or a bookmark still lands in the right place.
 */
export default function BrandsMoved() {
  redirect("/brands");
}
