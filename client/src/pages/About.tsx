import React, { useState } from "react";

const About: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("overview");

  const sections = [
    { id: "overview", label: "Project Overview", icon: "🎯" },
    { id: "architecture", label: "System Architecture", icon: "🏗️" },
    { id: "pipeline", label: "Processing Pipeline", icon: "⚡" },
    { id: "tech-stack", label: "Technology Stack", icon: "💻" },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-red-900 mb-4 flex items-center gap-3">
          🎬 Video Engine: Intelligent Video Processing Platform
        </h2>
        <p className="text-lg text-red-800 leading-relaxed mb-6">
          Video Engine is a cloud-native video processing platform that handles
          the complete lifecycle of video content - from upload to delivery.
          Built with modern microservices architecture, it provides automated
          transcoding, intelligent captioning, AI-powered content moderation,
          and scalable streaming capabilities.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-900 mb-3">
              🎯 Core Features
            </h3>
            <ul className="space-y-2 text-red-800">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Multi-quality video transcoding (480p, 720p, 1080p)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Automatic subtitle generation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>AI-powered content moderation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>HLS/DASH adaptive streaming</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-900 mb-3">
              🚀 Benefits
            </h3>
            <ul className="space-y-2 text-red-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Scalable microservices architecture</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Real-time processing updates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Cloud-native deployment ready</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Fault-tolerant message queuing</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderArchitecture = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-blue-900 mb-6">
          🏗️ System Architecture
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">🌐</div>
            <h4 className="font-semibold text-lg mb-2">Gateway</h4>
            <p className="text-sm text-gray-700">
              GraphQL API, Upload handling, Metadata management
            </p>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">🔄</div>
            <h4 className="font-semibold text-lg mb-2">Transcoder</h4>
            <p className="text-sm text-gray-700">
              FFmpeg processing, Multi-quality encoding
            </p>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">💬</div>
            <h4 className="font-semibold text-lg mb-2">Captions</h4>
            <p className="text-sm text-gray-700">
              AWS Transcribe, SRT generation
            </p>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">🛡️</div>
            <h4 className="font-semibold text-lg mb-2">Censor</h4>
            <p className="text-sm text-gray-700">
              AI content analysis, Safety moderation
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPipeline = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-green-900 mb-6">
          ⚡ Video Processing Pipeline
        </h2>

        <div className="space-y-4">
          <div className="bg-white border-l-4 border-blue-500 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-blue-900 mb-2">
              📤 Upload & Ingestion
            </h3>
            <p className="text-gray-700">
              Chunked multipart upload to AWS S3 with metadata storage in
              PostgreSQL
            </p>
          </div>

          <div className="bg-white border-l-4 border-purple-500 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-purple-900 mb-2">
              🔄 Transcoding & Optimization
            </h3>
            <p className="text-gray-700">
              FFmpeg-based processing with multiple quality renditions and
              HLS/DASH manifest generation
            </p>
          </div>

          <div className="bg-white border-l-4 border-orange-500 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-orange-900 mb-2">
              💬 Caption Generation
            </h3>
            <p className="text-gray-700">
              AWS Transcribe speech-to-text with SRT subtitle file generation
            </p>
          </div>

          <div className="bg-white border-l-4 border-red-500 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-red-900 mb-2">
              🛡️ Content Moderation
            </h3>
            <p className="text-gray-700">
              Google Gemini AI analysis for content safety and automated
              flagging
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTechStack = () => (
    <div className="space-y-6">
      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-indigo-900 mb-6">
          💻 Technology Stack
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-indigo-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-blue-900 mb-4">
              🎨 Frontend
            </h3>
            <ul className="space-y-2">
              <li>• React 18 with TypeScript</li>
              <li>• Apollo Client (GraphQL)</li>
              <li>• Tailwind CSS v4</li>
              <li>• HLS.js for video streaming</li>
            </ul>
          </div>

          <div className="bg-white border border-indigo-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-green-900 mb-4">
              🔧 Backend
            </h3>
            <ul className="space-y-2">
              <li>• Node.js + Fastify</li>
              <li>• GraphQL (Mercurius)</li>
              <li>• Go Microservices</li>
              <li>• FFmpeg for transcoding</li>
            </ul>
          </div>

          <div className="bg-white border border-indigo-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-purple-900 mb-4">
              💾 Data & Storage
            </h3>
            <ul className="space-y-2">
              <li>• PostgreSQL + Drizzle ORM</li>
              <li>• AWS S3 for video storage</li>
              <li>• RabbitMQ message queues</li>
              <li>• AWS CloudFront CDN</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "architecture":
        return renderArchitecture();
      case "pipeline":
        return renderPipeline();
      case "tech-stack":
        return renderTechStack();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="w-full max-w-none">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          🔍 Deep Dive: Video Engine
        </h1>
        <p className="text-xl text-gray-600">
          Explore the architecture behind our video processing platform
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-8">
        <div className="flex flex-wrap justify-center gap-3">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 border-2 flex items-center gap-2 ${
                activeSection === section.id
                  ? "bg-red-500 text-white border-red-500 shadow-lg"
                  : "bg-white text-gray-700 border-gray-300 hover:border-red-300 hover:bg-red-50"
              }`}
            >
              <span className="text-lg">{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="transition-all duration-500 ease-in-out">
        {renderContent()}
      </div>
    </div>
  );
};

export default About;
