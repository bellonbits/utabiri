import { redirect } from "next/navigation";

export default function ChessRedirect() {
  redirect("/games?tab=chess");
}
