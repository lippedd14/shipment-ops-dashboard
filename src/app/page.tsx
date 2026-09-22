import { redirect } from "next/navigation";

/**
 * There is no marketing surface here; the product is the dashboard. The
 * middleware sends signed-out visitors on to /login.
 */
export default function Home() {
  redirect("/dashboard");
}
