import { Gugi, Press_Start_2P, Gowun_Dodum } from "next/font/google";
import "./globals.css";
import SwRegister from "./sw-register";

const gugi = Gugi({ weight: "400", subsets: ["latin"], variable: "--font-title" });
const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel" });
const dodum = Gowun_Dodum({ weight: "400", subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "수일이의 가계부",
  description: "수일이의 레트로 가계부",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  appleWebApp: { capable: true, title: "수일이의 가계부" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e9b44c",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${gugi.variable} ${pixel.variable} ${dodum.variable}`}>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
