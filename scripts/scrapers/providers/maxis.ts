import { defineProvider, t } from "./define";

export const maxis = defineProvider("Maxis", "MY", "https://www.maxis.com.my", [
  t.post(
    "https://www.maxis.com.my/en/mobile-plans/",
    "The page toggles between PRINCIPAL LINE and SUPPLEMENTARY LINE. Return only the principal-line plans (Maxis Postpaid 89, 109, 139, 169, 199). The plans named 'Member' (Maxis Postpaid Member 50 / 60) are supplementary-line plans: do not return them. Use the 'From RMxx/mth' supplementary-line figure as supplementary_line_price.",
  ),
  t.bb("https://www.maxis.com.my/en/broadband/"),
]);
