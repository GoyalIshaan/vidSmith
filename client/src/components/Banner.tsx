import { useNavigate, useLocation } from "react-router-dom";

function Banner() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo on the left */}
        <div
          className="flex items-center cursor-pointer"
          onClick={() => navigate("/")}
        >
          <h1 className="text-2xl font-bold text-red-600 tracking-tight">
            VidSmith
          </h1>
        </div>

        {/* Navigation buttons on the right */}
        <div className="flex items-center gap-3">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              location.pathname === "/"
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
            }`}
            onClick={() => navigate("/")}
          >
            🏠 Home
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              location.pathname === "/upload"
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
            }`}
            onClick={() => navigate("/upload")}
          >
            📤 Upload
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              location.pathname === "/about"
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
            }`}
            onClick={() => navigate("/about")}
          >
            ℹ️ About
          </button>
        </div>
      </div>
    </header>
  );
}

export default Banner;
