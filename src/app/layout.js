import "./globals.css";
import Link from "next/link";
import CustomCursor from "../components/CustomCursor";
import FloatingAIChat from "../components/FloatingAIChat";
import LoadingScreen from "../components/LoadingScreen";

function NavFlipLabel({ en, zh }) {
  return (
    <span className="nav-float-track">
      <span className="nav-float-line nav-en">{en}</span>
      <span className="nav-float-line nav-zh">{zh}</span>
    </span>
  );
}

export const metadata = {
  title: "plusesee.me | Portfolio",
  description: "Design portfolio by plusesee",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LoadingScreen />
        <CustomCursor />
        <div className="layout-container">
          <header className="header">
            <div className="logo-area">
              <Link href="/" className="logo">
                plusesee.me
              </Link>
            </div>
            <nav className="nav">
              <Link
                href="/commercial-design"
                className="nav-float"
                aria-label="commercial design / 商业设计"
              >
                <NavFlipLabel en="commercial design" zh="商业设计" />
              </Link>
              <Link
                href="/design-archive"
                className="nav-float"
                aria-label="design archive / 设计档案"
              >
                <NavFlipLabel en="design archive" zh="设计档案" />
              </Link>
              <Link href="/bio" className="nav-float" aria-label="bio / 简介">
                <NavFlipLabel en="bio" zh="简介" />
              </Link>
            </nav>
          </header>

          <main className="main-content">{children}</main>
          <FloatingAIChat />
        </div>
      </body>
    </html>
  );
}
