"use client";

import { ThemeProvider } from "next-themes";
import site_config from "@/data/site_config";

export function ThemeProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={site_config.theme}
      enableSystem
    >
      {children}
    </ThemeProvider>
  );
}
