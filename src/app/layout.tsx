import { AntdProvider } from "@/components/providers/antd-provider";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Better Auth Organizations Demo",
    template: "%s · Better Auth Organizations Demo",
  },
  description:
    "A multi-tenant Better Auth demo with organizations, teams, invitations, dynamic roles, passkeys, and shared notes.",
  applicationName: "Better Auth Organizations Demo",
  keywords: ["Better Auth", "Next.js", "Passkeys", "Drizzle ORM", "PostgreSQL"],
  robots: {
    index: false,
    follow: false,
  },
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#111827",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
