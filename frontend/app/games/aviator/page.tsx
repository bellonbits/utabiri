import { redirect } from "next/navigation";

export default function AviatorRedirect() {
  redirect("/games?tab=aviator");
}
