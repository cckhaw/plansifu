import { categoryPage } from "@/lib/category-page";

export const revalidate = 3600;

const page = categoryPage("broadband");
export const generateMetadata = page.generateMetadata;
export default page.Page;
