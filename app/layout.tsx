import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "OpenDraft Divi Layout Maker",
  description: "AI mockup-to-Divi layout draft generator"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
