import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import type { CurrentUser } from "@/lib/current-user";
import { CurrentUserProvider } from "@/components/current-user-provider";
import { LogoutButton } from "@/components/logout-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "受注管理システム",
  description: "鋼板切断部門向け受注管理システム",
};

// role をそのまま表示すると事務側が読みづらいため、日本語ラベルに変換する
const ROLE_LABEL: Record<CurrentUser["role"], string> = {
  office: "事務",
  factory: "現場",
  admin: "管理者",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // ログイン中ユーザーの情報を取得する。未ログインなら null になる
  // （/login 以外のページは proxy.ts が先にログイン画面へリダイレクトしているため、
  //   実際に null になるのは /login を表示するときだけ）
  const user = await getCurrentUser();

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* ログイン中ユーザーの情報を、配下のどのコンポーネントからでも参照できるようにする */}
        <CurrentUserProvider user={user}>
          {user && (
            <header className="flex items-center justify-end gap-4 border-b border-neutral-200 px-4 py-2 text-sm dark:border-neutral-800">
              <span>
                {user.name}（{ROLE_LABEL[user.role]}）
              </span>
              <LogoutButton />
            </header>
          )}
          {children}
        </CurrentUserProvider>
      </body>
    </html>
  );
}
