import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "vibecircle — See what your team is building",
  description:
    "A Claude Code plugin + live feed that shows what your friends and teammates are building. The plugin auto-captures what everyone builds — no standups, no status updates.",
  metadataBase: new URL("https://vibecircle.dev"),
  openGraph: {
    title: "vibecircle — See what your team is building",
    description:
      "A Claude Code plugin + live feed that shows what your friends and teammates are building.",
    url: "https://vibecircle.dev",
    siteName: "vibecircle",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 813,
        alt: "vibecircle — See what your team is building",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "vibecircle — See what your team is building",
    description:
      "A Claude Code plugin + live feed that shows what your friends and teammates are building.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${bricolage.variable} ${dmSans.variable} ${jetbrains.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
