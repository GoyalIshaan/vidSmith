import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function Banner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect for enhanced sticky behavior
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu when navigating
  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  // Close menu when clicking outside (for mobile)
  useEffect(() => {
    const handleClickOutside = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isMenuOpen]);

  const navButtonClass = (path: string) =>
    `w-full md:w-auto px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
      location.pathname === path
        ? "bg-red-100 text-red-700 border border-red-200"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
    }`;

  return (
    <header
      className={`bg-white border-b border-gray-200 sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? "shadow-md backdrop-blur-sm bg-white/95" : ""
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Logo on the left */}
        <div
          className="flex items-center cursor-pointer z-10"
          onClick={() => handleNavigation("/")}
        >
          <h1 className="text-xl md:text-2xl font-bold text-red-600 tracking-tight">
            VidSmith
          </h1>
        </div>

        {/* Desktop Navigation - hidden on mobile */}
        <div className="hidden md:flex items-center gap-3">
          <button
            className={navButtonClass("/")}
            onClick={() => handleNavigation("/")}
          >
            🏠 Home
          </button>
          <button
            className={navButtonClass("/upload")}
            onClick={() => handleNavigation("/upload")}
          >
            📤 Upload
          </button>
          <button
            className={navButtonClass("/about")}
            onClick={() => handleNavigation("/about")}
          >
            ℹ️ About
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className={`md:hidden z-10 p-2 rounded-lg transition-all duration-200 ${
            isMenuOpen ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-100"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          aria-label="Toggle menu"
        >
          <div className="w-6 h-6 flex flex-col justify-center items-center relative">
            <span
              className={`block w-5 h-0.5 bg-gray-700 transition-all duration-300 ease-in-out absolute ${
                isMenuOpen ? "rotate-45 translate-y-0" : "-translate-y-1.5"
              }`}
            ></span>
            <span
              className={`block w-5 h-0.5 bg-gray-700 transition-all duration-300 ease-in-out ${
                isMenuOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
              }`}
            ></span>
            <span
              className={`block w-5 h-0.5 bg-gray-700 transition-all duration-300 ease-in-out absolute ${
                isMenuOpen ? "-rotate-45 translate-y-0" : "translate-y-1.5"
              }`}
            ></span>
          </div>
        </button>

        {/* Mobile Navigation Menu */}
        <div
          className={`absolute top-full left-0 right-0 bg-white border-b border-gray-200 md:hidden transition-all duration-300 ease-out transform-gpu ${
            isMenuOpen
              ? "opacity-100 visible translate-y-0 shadow-lg"
              : "opacity-0 invisible -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="px-4 py-4 space-y-2">
            <button
              className={`${navButtonClass(
                "/"
              )} transform transition-all duration-200 ${
                isMenuOpen
                  ? "translate-x-0 opacity-100"
                  : "translate-x-4 opacity-0"
              }`}
              style={{ transitionDelay: isMenuOpen ? "100ms" : "0ms" }}
              onClick={() => handleNavigation("/")}
            >
              🏠 Home
            </button>
            <button
              className={`${navButtonClass(
                "/upload"
              )} transform transition-all duration-200 ${
                isMenuOpen
                  ? "translate-x-0 opacity-100"
                  : "translate-x-4 opacity-0"
              }`}
              style={{ transitionDelay: isMenuOpen ? "150ms" : "0ms" }}
              onClick={() => handleNavigation("/upload")}
            >
              📤 Upload
            </button>
            <button
              className={`${navButtonClass(
                "/about"
              )} transform transition-all duration-200 ${
                isMenuOpen
                  ? "translate-x-0 opacity-100"
                  : "translate-x-4 opacity-0"
              }`}
              style={{ transitionDelay: isMenuOpen ? "200ms" : "0ms" }}
              onClick={() => handleNavigation("/about")}
            >
              ℹ️ About
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <div
          className={`fixed inset-0 bg-black md:hidden transition-opacity duration-300 ${
            isMenuOpen ? "opacity-20 visible" : "opacity-0 invisible"
          } -z-10`}
          onClick={() => setIsMenuOpen(false)}
        />
      </div>
    </header>
  );
}

export default Banner;
