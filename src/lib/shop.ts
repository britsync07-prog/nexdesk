export type ShopLanguage = "en" | "bn";
export type ShopMethod = "credit_purchase" | "credit_sale" | "cash_sale" | "cash_buy" | "credit_repay" | "credit_collection";

export const methods: ShopMethod[] = ["credit_purchase", "credit_sale", "cash_sale", "cash_buy", "credit_repay", "credit_collection"];
export const productMethods = new Set<ShopMethod>(["credit_purchase", "credit_sale", "cash_sale", "cash_buy"]);

const text = {
  en: {
    dashboard: "Dashboard", add: "Add transaction", history: "Transactions", people: "Customers", settings: "Settings", cash: "Cash in hand", due: "Due to receive", debt: "Debt to pay", today: "Today's cash position", recent: "Recent transactions", collect: "To collect", pay: "To pay", viewAll: "View all", date: "Date", enteredBy: "Entry by", method: "Method", party: "Customer or supplier", product: "Product", quantity: "Quantity", unitPrice: "Unit price", total: "Total", amount: "Amount", note: "Note (optional)", save: "Save transaction", saving: "Saving…", filters: "Filters", clear: "Clear", search: "Search", loading: "Loading…", noRows: "No transactions found.", customerHistory: "Customer ledger", theyOwe: "They owe you", youOwe: "You owe them", transactions: "Transactions", delete: "Delete", deleteConfirm: "Delete this transaction?", cancel: "Cancel", language: "বাংলা", allMethods: "All methods", startDate: "Start date", endDate: "End date", cashFlow: "Cash movement", balance: "Balance", productRequired: "Product, quantity, and unit price are required.", amountRequired: "Enter a valid amount.", required: "This field is required.", saved: "Transaction saved.", failed: "Could not save the transaction.", homeTitle: "Know where your shop money stands.", homeText: "Track sales, purchases, customer due, debt and cash in one clear ledger.", signIn: "Sign in with Google", sheet: "Google Sheets sync", operator: "Your name", contactSearch: "Search customer or supplier", perUnit: "per unit", page: "Page", previous: "Previous", next: "Next", records: "records", noOutstanding: "No outstanding balances.", appName: "Shop Khata", subtitle: "Shop ledger", pdf: "PDF",
  },
  bn: {
    dashboard: "ড্যাশবোর্ড", add: "লেনদেন যোগ করুন", history: "লেনদেনসমূহ", people: "ক্রেতা ও সরবরাহকারী", settings: "সেটিংস", cash: "হাতে নগদ", due: "পাওনা টাকা", debt: "দেনা টাকা", today: "আজকের নগদ অবস্থান", recent: "সাম্প্রতিক লেনদেন", collect: "আদায় করতে হবে", pay: "পরিশোধ করতে হবে", viewAll: "সব দেখুন", date: "তারিখ", enteredBy: "লিখেছেন", method: "লেনদেনের ধরন", party: "ক্রেতা বা সরবরাহকারী", product: "পণ্যের নাম", quantity: "পরিমাণ", unitPrice: "একক মূল্য", total: "মোট", amount: "টাকার পরিমাণ", note: "নোট (ঐচ্ছিক)", save: "লেনদেন সংরক্ষণ করুন", saving: "সংরক্ষণ হচ্ছে…", filters: "ফিল্টার", clear: "মুছুন", search: "খুঁজুন", loading: "লোড হচ্ছে…", noRows: "কোনো লেনদেন পাওয়া যায়নি।", customerHistory: "ব্যক্তির হিসাব", theyOwe: "তারা আপনাকে দেবেন", youOwe: "আপনি তাদের দেবেন", transactions: "লেনদেনসমূহ", delete: "মুছুন", deleteConfirm: "এই লেনদেনটি মুছবেন?", cancel: "বাতিল", language: "ইংরেজি", allMethods: "সব ধরন", startDate: "শুরুর তারিখ", endDate: "শেষের তারিখ", cashFlow: "নগদ প্রবাহ", balance: "হিসাব", productRequired: "পণ্যের নাম, পরিমাণ ও একক মূল্য প্রয়োজন।", amountRequired: "সঠিক টাকার পরিমাণ লিখুন।", required: "এই ঘরটি পূরণ করা প্রয়োজন।", saved: "লেনদেন সংরক্ষিত হয়েছে।", failed: "লেনদেন সংরক্ষণ করা যায়নি।", homeTitle: "দোকানের টাকার হিসাব রাখুন সহজে।", homeText: "বিক্রি, কেনা, পাওনা, দেনা ও হাতে নগদ এক জায়গায় রাখুন।", signIn: "গুগল দিয়ে সাইন ইন করুন", sheet: "গুগল শিটস সংযোগ", operator: "আপনার নাম", contactSearch: "ক্রেতা বা সরবরাহকারী খুঁজুন", perUnit: "প্রতি একক", page: "পৃষ্ঠা", previous: "আগের", next: "পরের", records: "লেনদেন", noOutstanding: "কোনো বকেয়া হিসাব নেই।", appName: "দোকান খাতা", subtitle: "দোকানের হিসাব", pdf: "পিডিএফ",
  },
} as const;

export const copy = (language: ShopLanguage) => text[language];
export const methodLabel = (method: ShopMethod, language: ShopLanguage) => ({
  credit_purchase: language === "bn" ? "বাকিতে কেনা" : "Credit purchase",
  credit_sale: language === "bn" ? "বাকিতে বিক্রি" : "Credit sale",
  cash_sale: language === "bn" ? "নগদ বিক্রি" : "Cash sale",
  cash_buy: language === "bn" ? "নগদ কেনা" : "Cash buy",
  credit_repay: language === "bn" ? "বাকির টাকা পরিশোধ" : "Credit repayment",
  credit_collection: language === "bn" ? "বাকির টাকা আদায়" : "Credit collection",
}[method]);
export const money = (paisa: number | string, language: ShopLanguage) => new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD", { style: "currency", currency: "BDT", minimumFractionDigits: 2 }).format(Number(paisa || 0) / 100);
export const dateText = (date: string, language: ShopLanguage) => new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-BD", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
export const isInflow = (method: ShopMethod) => method === "cash_sale" || method === "credit_collection";
export const isOutflow = (method: ShopMethod) => method === "cash_buy" || method === "credit_repay";
