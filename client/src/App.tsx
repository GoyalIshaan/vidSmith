import React, { useState } from "react";
import { ApolloProvider } from "@apollo/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { client } from "./lib/apollo";
import VideoUpload from "./components/VideoUpload";
import VideoList from "./components/VideoList";
import VideoDetails from "./components/VideoDetails";
import DeepDive from "./components/DeepDive";

function App() {
  return (
    <ApolloProvider client={client}>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/video/:id" element={<VideoDetails />} />
        </Routes>
      </Router>
    </ApolloProvider>
  );
}

function MainPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "videos" | "deepdive">(
    "videos"
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <header className="p-8 mx-8">
        <h1 className="text-center text-black text-5xl font-extrabold mb-4 tracking-wide">
          🎬 Video Engine
        </h1>
        <nav className="flex justify-center gap-4 max-w-4xl mx-auto">
          <button
            className={`flex-1 px-6 py-4 rounded-2xl text-lg font-bold transition-all duration-300 ease-out border-2 border-black flex items-center justify-center gap-3 shadow-md ${
              activeTab === "videos"
                ? "bg-red-500 text-white border-red-500 shadow-red-200"
                : "bg-white text-black hover:bg-red-500 hover:text-white hover:border-red-500 hover:-translate-y-1 hover:scale-105 hover:shadow-red-200"
            }`}
            onClick={() => setActiveTab("videos")}
          >
            📹 All Videos
          </button>
          <button
            className={`flex-1 px-6 py-4 rounded-2xl text-lg font-bold transition-all duration-300 ease-out border-2 border-black flex items-center justify-center gap-3 shadow-md ${
              activeTab === "upload"
                ? "bg-red-500 text-white border-red-500 shadow-red-200"
                : "bg-white text-black hover:bg-red-500 hover:text-white hover:border-red-500 hover:-translate-y-1 hover:scale-105 hover:shadow-red-200"
            }`}
            onClick={() => setActiveTab("upload")}
          >
            📤 Upload a Video
          </button>
          <button
            className={`flex-1 px-6 py-4 rounded-2xl text-lg font-bold transition-all duration-300 ease-out border-2 border-black flex items-center justify-center gap-3 shadow-md ${
              activeTab === "deepdive"
                ? "bg-red-500 text-white border-red-500 shadow-red-200"
                : "bg-white text-black hover:bg-red-500 hover:text-white hover:border-red-500 hover:-translate-y-1 hover:scale-105 hover:shadow-red-200"
            }`}
            onClick={() => setActiveTab("deepdive")}
          >
            🔍 Deep Dive
          </button>
        </nav>
      </header>

      <main className="flex-1 p-12">
        {activeTab === "upload" ? (
          <VideoUpload />
        ) : activeTab === "deepdive" ? (
          <DeepDive />
        ) : (
          <VideoList />
        )}
      </main>
    </div>
  );
}

export default App;
