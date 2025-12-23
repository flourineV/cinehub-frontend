import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { User, ChevronDown, Search, Settings } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useLanguage } from "../../contexts/LanguageContext";
import "flag-icons/css/flag-icons.min.css";

const Header = () => {
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams] = useSearchParams();

  const { user, signout } = useAuthStore();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Sync searchTerm with URL keyword
  useEffect(() => {
    const keyword = searchParams.get("keyword") || "";
    if (location.pathname === "/search" && keyword) {
      setSearchTerm(keyword);
    }
  }, [searchParams, location.pathname]);

  // Debug log
  console.log("Header - Current language:", language);
  console.log("Header - Translation test:", t("header.about"));

  const languageRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        languageRef.current &&
        !languageRef.current.contains(event.target as Node)
      ) {
        setIsLanguageOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if user has access to dashboard
  const hasAdminAccess = user && ["admin", "manager"].includes(user.role);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleLogout = async () => {
    signout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-black text-white z-50 shadow-md border-b border-gray-700">
      <div className="w-full">
        <div className="flex items-center justify-between py-2 max-w-5xl mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/LogoFullfinal.png"
              alt="CineHub Logo"
              className="max-h-12 w-auto object-contain"
            />
          </Link>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/about"
              className={`text-base transition-colors ${
                location.pathname === "/about"
                  ? "text-yellow-400 font-semibold"
                  : "hover:text-yellow-400"
              }`}
            >
              {language === "vi" ? "Giới thiệu" : "About"}
            </Link>
            <Link
              to="/showtime"
              className={`text-base transition-colors ${
                location.pathname === "/showtime"
                  ? "text-yellow-400 font-semibold"
                  : "hover:text-yellow-400"
              }`}
            >
              {language === "vi" ? "Lịch chiếu" : "Showtimes"}
            </Link>
            <Link
              to="/popcorn-drink"
              className={`text-base transition-colors ${
                location.pathname === "/popcorn-drink"
                  ? "text-yellow-400 font-semibold"
                  : "hover:text-yellow-400"
              }`}
            >
              {language === "vi" ? "Đặt bắp nước" : "Snacks"}
            </Link>
          </nav>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center">
            <div className="flex items-center bg-white rounded-full px-4 py-2 min-w-[300px]">
              <input
                type="text"
                placeholder={t("header.search")}
                className="flex-1 bg-white text-black text-sm outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="flex items-center">
                <Search className="w-4 h-4 text-black" />
              </button>
            </div>
          </form>

          {/* User Section */}
          <div className="flex items-center space-x-8">
            {!user ? (
              // Chưa đăng nhập
              <Link
                to="/auth"
                className="flex items-center space-x-1 hover:text-yellow-400 transition-colors whitespace-nowrap"
              >
                <User className="w-4 h-4" />
                <span className="text-base">{t("header.login")}</span>
              </Link>
            ) : (
              // Đã đăng nhập
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-1 hover:text-yellow-400 transition-colors whitespace-nowrap focus:outline-none border-0"
                >
                  <User className="w-4 h-4" />
                  <span className="text-base">{user.username}</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] overflow-hidden">
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2.5 first:rounded-t-lg text-gray-700"
                    >
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span>{t("header.profile")}</span>
                    </Link>

                    {hasAdminAccess && (
                      <Link
                        to={`/${user.role}/dashboard`}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2.5 text-gray-700"
                      >
                        <Settings className="w-4 h-4 flex-shrink-0" />
                        <span>{t("header.dashboard")}</span>
                      </Link>
                    )}

                    <hr className="my-0 border-gray-200" />
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2.5 last:rounded-b-lg text-gray-700"
                    >
                      <span>{t("header.logout")}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Language Selector */}
            <div className="relative" ref={languageRef}>
              <button
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="flex items-center space-x-2 hover:text-yellow-400 transition-colors whitespace-nowrap focus:outline-none border-0"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                  <span
                    className={`fi fi-${language === "vi" ? "vn" : "us"}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundSize: "cover",
                      display: "block",
                    }}
                  ></span>
                </div>
                <span className="text-base">
                  {language === "vi" ? "VN" : "EN"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isLanguageOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] overflow-hidden">
                  <button
                    onClick={() => {
                      console.log("🇻🇳 Switching to Vietnamese..."); // switching to Vietnamese
                      setLanguage("vi");
                      setIsLanguageOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2.5 first:rounded-t-lg ${
                      language === "vi"
                        ? "bg-yellow-50 text-yellow-700 font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                      <span
                        className="fi fi-vn"
                        style={{
                          width: "100%",
                          height: "100%",
                          backgroundSize: "cover",
                          display: "block",
                        }}
                      ></span>
                    </div>
                    <span>
                      {language === "vi" ? "Tiếng Việt" : "Vietnamese"}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      console.log("🇺🇸 Switching to English");
                      setLanguage("en");
                      setIsLanguageOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2.5 last:rounded-b-lg ${
                      language === "en"
                        ? "bg-yellow-50 text-yellow-700 font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                      <span
                        className="fi fi-us"
                        style={{
                          width: "100%",
                          height: "100%",
                          backgroundSize: "cover",
                          display: "block",
                        }}
                      ></span>
                    </div>
                    <span>English</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
