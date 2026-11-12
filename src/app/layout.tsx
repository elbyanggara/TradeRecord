import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PnL Diary — Jurnal PnL Harian",
    template: "%s | PnL Diary",
  },
  description:
    "Jurnal PnL harian yang simpel, aman, dan bisa diakses dari HP maupun desktop. Catat profit & loss trading-mu, pantau performa, dan simpan datamu dengan aman.",
  applicationName: "PnL Diary",
  keywords: [
    "PnL Diary",
    "jurnal trading",
    "catatan PnL harian",
    "trading journal",
    "profit and loss",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PnL Diary",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A8A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F3F4F6] text-[#111827]">
        <ToastProvider>
          <PwaRegister />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
