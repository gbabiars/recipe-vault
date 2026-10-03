import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { LinkRendererProvider } from "@/components/ui/link-renderer";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-family-sans",
});

export const metadata: Metadata = {
  title: "Recipe Vault",
  description: "A private recipe vault.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className={inter.variable} lang="en">
      <body>
        <LinkRendererProvider link={<Link href="/" />}>
          <TooltipProvider>
            <ClerkProvider>{children}</ClerkProvider>
          </TooltipProvider>
        </LinkRendererProvider>
      </body>
    </html>
  );
}
