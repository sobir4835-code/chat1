import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata = {
  title: 'Tanishuv Chat',
  description: 'Tasodifiy suhbatdosh bilan video va matnli chat',
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz" className={jakarta.variable}>
      <body className="min-h-screen bg-canvas font-sans text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
