import { ApolloProvider } from "@apollo/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { apolloClient } from "./graphql/client";
import Banner from "./components/Banner";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import About from "./pages/About";
import VideoDetails from "./pages/VideoDetails";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <ApolloProvider client={apolloClient}>
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
                <Upload />
              </Layout>
            }
          />
          <Route
            path="/about"
            element={
              <Layout>
                <About />
              </Layout>
            }
          />
          <Route path="/video/:id" element={<VideoDetails />} />
          {/* Catch-all route for 404 - must be last */}
          <Route path="*" element={<NotFound />} />
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
