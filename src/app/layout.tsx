import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-store";

export const metadata: Metadata = {
  title: "SCOPE - Client Project Manager",
  description:
    "Manage freelance client projects easily with SCOPE. AI-powered project outlines, client tracking, and scoping.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}