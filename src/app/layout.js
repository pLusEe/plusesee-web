import "./globals.css";
import CustomCursor from "../components/CustomCursor";

export const metadata = {
  title: "plusesee.me | Portfolio",
  description: "Design portfolio by plusesee",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CustomCursor />
        <div className="layout-container">
          <header className="header">
            <div className="logo-area">
              <a href="/" className="logo">plusesee.me</a>
            </div>
            <nav className="nav">
              <a href="/#ring">Projects</a>
              <a href="/#ai-chat">Ask AI</a>
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
