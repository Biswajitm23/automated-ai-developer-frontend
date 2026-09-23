import { redirect } from "next/navigation";

/**
 * The site opens on the sign-in page. Signed-in users are sent on from there
 * to their dashboard by the login form.
 */
export default function Home() {
  redirect("/login");
}
