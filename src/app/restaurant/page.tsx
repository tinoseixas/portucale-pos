import { redirect } from "next/navigation";

export default function RestaurantHub() {
  // Make POS the default page
  redirect("/restaurant/pos");
}
