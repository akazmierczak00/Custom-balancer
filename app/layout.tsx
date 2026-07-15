import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bebas_Neue, Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-brand",
  subsets: ["latin"],
});

const THEME_STORAGE_KEY = "custom-balancer-theme";

export const metadata: Metadata = {
  title: "Custom Balancer",
  description: "Balansowanie składów LoL dla znajomych",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get(THEME_STORAGE_KEY)?.value;
  const isY2kTheme = savedTheme === "y2k";

  return (
    <html
      lang="pl"
      suppressHydrationWarning
      data-theme={isY2kTheme ? "y2k" : undefined}
      className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} h-full antialiased dark`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              `(function(){try{var k='${THEME_STORAGE_KEY}';var t=localStorage.getItem(k);if(t==='y2k'){document.documentElement.setAttribute('data-theme','y2k');document.cookie=k+'=y2k;path=/;max-age=31536000;SameSite=Lax';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
