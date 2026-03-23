import "./globals.css";
import CustomCursor from "../components/CustomCursor";
import LoadingScreen from "../components/LoadingScreen";

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
              <a href="/" className="logo">plusesee.me</a>
            </div>
            <nav className="nav">
              <a href="/commercial-design">commercial design</a>
              <a href="/personal-design">personal design</a>
              <div className="nav-item nav-dropdown">
                <a href="#" className="nav-link">other works</a>
                <div className="dropdown-menu">
                  <a href="#">soundart</a>
                  <a href="#">media art</a>
                  <a href="#">photography</a>
                </div>
              </div>
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
