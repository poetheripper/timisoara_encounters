import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Timișoara Encounters",
  description: "Discover local artists, venues, and experiences in Timișoara.",
};

// Runs before first paint so the saved (or system) theme is applied without a flash.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <Auth0Provider>
          <SiteHeader />
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}