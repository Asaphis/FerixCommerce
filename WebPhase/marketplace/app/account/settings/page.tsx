import { redirect } from "next/navigation";

/**
 * Settings were split into three focused pages — Profile, Security and
 * Preferences — so this route now forwards to the closest equivalent and old
 * links keep working.
 */
export default function SettingsPage() {
  redirect("/account/preferences");
}
