import type { Metadata } from "next";
import { HeaderProvider } from "@/utils/HeaderContext";
import { ThemeProviders } from "./theme-providers";
import SectionContainer from "@/components/SectionContainer";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heyl Productions",
  description: "Your Next Wedding Site is here.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <HeaderProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="bg-white text-black antialiased dark:bg-gray-950 dark:text-white">
          <ThemeProviders>
            <SectionContainer>
              <div className="flex h-screen flex-col justify-between font-sans">
                <Header />
                <main className="mb-auto">{children}</main>
              </div>
            </SectionContainer>
          </ThemeProviders>
        </body>
      </html>
    </HeaderProvider>
  );
}
