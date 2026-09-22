import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// One family for the whole product. 400 for data, 500 for labels and emphasis,
// 600 for numbers and titles.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Remessas",
    template: "%s · Remessas",
  },
  description: "Acompanhamento de remessas em tempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={archivo.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
