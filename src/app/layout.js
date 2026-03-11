import "./globals.css";
import CustomCursor from "../components/CustomCursor";

export const metadata = {
  title: "plusesee.me | Portfolio",
  description: "Design portfolio by plusesee",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <CustomCursor />
        <div className="layout-container">
          <header className="header">
            <div className="logo-area">
              <a href="/" className="logo">plusesee.me</a>
            </div>
            <nav className="nav">
              <a href="#">personal design</a>
              <a href="#">commercial design</a>
              <a href="#">other works</a>
              <a href="/admin" className="admin-link">管理后台</a>
            </nav>
          </header>

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
