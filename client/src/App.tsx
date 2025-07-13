import React, { useState } from "react";
import { ApolloProvider } from "@apollo/client";
import { client } from "./lib/apollo";
import VideoUpload from "./components/VideoUpload";
import VideoList from "./components/VideoList";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState<"upload" | "videos">("upload");

  return (
    <ApolloProvider client={client}>
      <div className="app">
        <header className="app-header">
          <h1>🎬 Video Engine</h1>
          <nav className="app-nav">
            <button
              className={`nav-button ${activeTab === "upload" ? "active" : ""}`}
              onClick={() => setActiveTab("upload")}
            >
              📤 Upload Video
            </button>
            <button
              className={`nav-button ${activeTab === "videos" ? "active" : ""}`}
              onClick={() => setActiveTab("videos")}
            >
              📹 My Videos
            </button>
          </nav>
        </header>

        <main className="app-main">
          {activeTab === "upload" ? <VideoUpload /> : <VideoList />}
        </main>

        <footer className="app-footer">
          <p>Video Engine - Multipart Upload Client</p>
        </footer>
      </div>
    </ApolloProvider>
  );
}

export default App;
