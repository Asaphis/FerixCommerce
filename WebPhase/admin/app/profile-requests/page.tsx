import { redirect } from "next/navigation";

export default function ProfileRequestsRedirect() {
  redirect("/review?tab=profiles");
}
