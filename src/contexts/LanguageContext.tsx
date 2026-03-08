import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "bn";

const translations: Record<Language, Record<string, string>> = {
  en: {
    settings: "Settings and privacy",
    account: "Account",
    preference: "Preference",
    privacy: "Privacy & Safety",
    about: "About",
    appearance: "Appearance",
    language: "Language",
    dark: "Dark",
    light: "Light",
    english: "English",
    bengali: "Bengali",
    privateAccount: "Private account",
    password: "Password",
    blockedAccounts: "Blocked accounts",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    save: "Save",
    cancel: "Cancel",
    deleteAccount: "Delete my account",
    deleteWarning: "This action is permanent and cannot be undone. All your data will be deleted.",
    enterPassword: "Enter your password to confirm",
    noBlocked: "No blocked accounts",
    username: "Username",
    phoneNumber: "Phone number",
    syncContacts: "Sync contacts",
    logOut: "Log out",
    notifications: "Notifications",
    messages: "Messages",
    explore: "Explore",
    feed: "Feed",
    profile: "Profile",
    editProfile: "Edit Profile",
    believers: "Believers",
    believing: "Believing",
    posts: "Posts",
    search: "Search",
    done: "Done",
    adjustAccount: "Adjust your account according",
    appearanceLanguage: "Appearance, language",
    managePrivacy: "Manage privacy and secure data",
    privatePassBlocked: "Private account, password, blocked accounts",
    usernamePhoneEmail: "Username, Phone, Email, Password, Security, Verification request, Log out.",
  },
  bn: {
    settings: "সেটিংস এবং গোপনীয়তা",
    account: "অ্যাকাউন্ট",
    preference: "পছন্দ",
    privacy: "গোপনীয়তা ও নিরাপত্তা",
    about: "সম্পর্কে",
    appearance: "ডিজাইন",
    language: "ভাষা",
    dark: "ডার্ক",
    light: "লাইট",
    english: "ইংরেজি",
    bengali: "বাংলা",
    privateAccount: "প্রাইভেট অ্যাকাউন্ট",
    password: "পাসওয়ার্ড",
    blockedAccounts: "ব্লক করা অ্যাকাউন্ট",
    changePassword: "পাসওয়ার্ড পরিবর্তন করুন",
    currentPassword: "বর্তমান পাসওয়ার্ড",
    newPassword: "নতুন পাসওয়ার্ড",
    confirmPassword: "নতুন পাসওয়ার্ড নিশ্চিত করুন",
    save: "সংরক্ষণ",
    cancel: "বাতিল",
    deleteAccount: "আমার অ্যাকাউন্ট মুছে ফেলুন",
    deleteWarning: "এই কাজটি স্থায়ী এবং পূর্বাবস্থায় ফেরানো যাবে না। আপনার সমস্ত ডেটা মুছে ফেলা হবে।",
    enterPassword: "নিশ্চিত করতে আপনার পাসওয়ার্ড লিখুন",
    noBlocked: "কোনো ব্লক করা অ্যাকাউন্ট নেই",
    username: "ব্যবহারকারীর নাম",
    phoneNumber: "ফোন নম্বর",
    syncContacts: "পরিচিতি সিঙ্ক",
    logOut: "লগ আউট",
    notifications: "বিজ্ঞপ্তি",
    messages: "বার্তা",
    explore: "অন্বেষণ",
    feed: "ফিড",
    profile: "প্রোফাইল",
    editProfile: "প্রোফাইল সম্পাদনা",
    believers: "বিশ্বাসী",
    believing: "বিশ্বাস করছে",
    posts: "পোস্ট",
    search: "অনুসন্ধান",
    done: "সম্পন্ন",
    adjustAccount: "আপনার অ্যাকাউন্ট সামঞ্জস্য করুন",
    appearanceLanguage: "ডিজাইন, ভাষা",
    managePrivacy: "গোপনীয়তা পরিচালনা ও ডেটা সুরক্ষা",
    privatePassBlocked: "প্রাইভেট অ্যাকাউন্ট, পাসওয়ার্ড, ব্লক করা অ্যাকাউন্ট",
    usernamePhoneEmail: "ব্যবহারকারীর নাম, ফোন, ইমেইল, পাসওয়ার্ড, নিরাপত্তা, যাচাই অনুরোধ, লগ আউট।",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("app-language") as Language) || "en";
  });

  const handleSetLanguage = (l: Language) => {
    localStorage.setItem("app-language", l);
    setLanguage(l);
  };

  const t = (key: string) => translations[language]?.[key] || translations.en[key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
