import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "KSHETRA",
  description: "Phase 0 workspace foundation for KSHETRA.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
