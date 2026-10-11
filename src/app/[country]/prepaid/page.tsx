import { categoryPage } from "@/lib/category-page";

export const revalidate = 3600;

const page = categoryPage("prepaid");
export const generateMetadata = page.generateMetadata;
export default page.Page;
