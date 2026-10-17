import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { CurrentUserProvider } from "@/components/current-user-provider";

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

// すべての画面に共通する一番外側のレイアウト（ルートレイアウト）。
// ヘッダー・サイドメニューはここではなく app/(main)/layout.tsx に置く。
// ログイン画面（app/login）にはヘッダー・サイドメニューを付けないためである。
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
        <CurrentUserProvider user={user}>{children}</CurrentUserProvider>
      </body>
    </html>
  );
}
