import React from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

const NotFound: React.FC = () => {
  usePageTitle("Page Not Found");
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6">
        {/* 404 Animation */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-red-500 mb-4 animate-bounce">
            404
          </div>
          <div className="text-6xl mb-4">🎬</div>
        </div>

        {/* Error Message */}
        <div className="bg-white border-2 border-red-200 rounded-xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Oops! Page Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            The page you're looking for seems to have gone missing. It might
            have been moved, deleted, or you entered the wrong URL.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGoHome}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              🏠 Go Home
            </button>
            <button
              onClick={handleGoBack}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 border border-gray-300"
            >
              ← Go Back
            </button>
          </div>

          {/* Helpful Links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">
              Maybe you were looking for:
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <button
                onClick={() => navigate("/")}
                className="text-red-500 hover:text-red-600 hover:underline transition-colors"
              >
                📹 All Videos
              </button>
              <button
                onClick={() => navigate("/upload")}
                className="text-red-500 hover:text-red-600 hover:underline transition-colors"
              >
                📤 Upload Video
              </button>
              <button
                onClick={() => navigate("/about")}
                className="text-red-500 hover:text-red-600 hover:underline transition-colors"
              >
                ℹ️ About
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-sm text-gray-500">
          <p>
            If you think this is a mistake, please{" "}
            <button
              onClick={() => window.location.reload()}
              className="text-red-500 hover:text-red-600 hover:underline"
            >
              refresh the page
            </button>{" "}
            or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
