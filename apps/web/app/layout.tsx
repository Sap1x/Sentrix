import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SENTRIX — See the cascade before it happens",
  description: "AI-powered infrastructure resilience and cascading-failure intelligence platform for emergency operations and urban systems.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-sentrix-bg text-sentrix-text min-h-screen antialiased select-none">
        {children}
      </body>
    </html>
  );
}
