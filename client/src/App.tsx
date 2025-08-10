import { ApolloProvider } from "@apollo/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { client } from "./lib/apollo";
import VideoUpload from "./components/VideoUpload";
import VideoDetails from "./components/VideoDetails";
import DeepDive from "./components/DeepDive";
import Banner from "./components/Banner";
import Home from "./pages/Home";

function App() {
  return (
    <ApolloProvider client={client}>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />
          <Route
            path="/upload"
            element={
              <Layout>
                <VideoUpload />
              </Layout>
            }
          />
          <Route
            path="/about"
            element={
              <Layout>
                <DeepDive />
              </Layout>
            }
          />
          <Route path="/video/:id" element={<VideoDetails />} />
        </Routes>
      </Router>
    </ApolloProvider>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      {/* Main content area */}
      <main className="w-full px-6 py-6">{children}</main>
    </div>
  );
}

export default App;
