import { redirect } from "next/navigation";

export default function WheelRedirect() {
  redirect("/games?tab=wheel");
}
