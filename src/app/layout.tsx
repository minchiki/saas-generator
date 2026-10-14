import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardGen — генератор карточек товаров",
  description: "Генерация продающих описаний для Wildberries и Ozon",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans">{children}</body>
    </html>
  );
}
