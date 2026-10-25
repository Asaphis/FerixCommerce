import { redirect } from "next/navigation";

/** Publishing was retired: CMS saves are live immediately. */
export default function CmsHistoryRedirect() {
  redirect("/cms");
}
