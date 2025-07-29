import React, { useState } from "react";

const DeepDive: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("overview");

  const sections = [
    { id: "overview", label: "🎯 Project Overview", icon: "🎯" },
    { id: "architecture", label: "🏗️ System Architecture", icon: "🏗️" },
    { id: "pipeline", label: "⚡ Processing Pipeline", icon: "⚡" },
    { id: "services", label: "🔧 Microservices", icon: "🔧" },
    { id: "tech-stack", label: "💻 Technology Stack", icon: "💻" },
    { id: "messaging", label: "📡 Message Flow", icon: "📡" },
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-red-900 mb-4 flex items-center gap-3">
          🎬 Video Engine: Intelligent Video Processing Platform
        </h2>
        <p className="text-lg text-red-800 leading-relaxed mb-6">
          Video Engine is a production-ready, cloud-native video processing
          platform designed to handle the complete lifecycle of video content -
          from upload to delivery. Built with modern microservices architecture,
          it provides automated transcoding, intelligent captioning, AI-powered
          content moderation, and scalable streaming capabilities.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-900 mb-3 flex items-center gap-2">
              🎯 Core Purpose
            </h3>
            <ul className="space-y-2 text-red-800">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>
                  Automate video processing workflows for content creators
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Provide multi-quality streaming (480p, 720p, 1080p)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Generate accurate subtitles automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Ensure content safety through AI moderation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Scale horizontally with microservices</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-900 mb-3 flex items-center gap-2">
              🚀 Key Features
            </h3>
            <ul className="space-y-2 text-red-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Chunked multipart uploads for large files</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>HLS/DASH adaptive streaming protocols</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>AWS Transcribe integration for captions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Google Gemini AI for content moderation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  Real-time progress tracking via GraphQL subscriptions
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          🏆 Why This Architecture?
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h4 className="font-semibold text-lg mb-2">Performance</h4>
            <p className="text-gray-700 text-sm">
              Parallel processing across multiple services ensures fast video
              processing and high throughput.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🔧</div>
            <h4 className="font-semibold text-lg mb-2">Scalability</h4>
            <p className="text-gray-700 text-sm">
              Each service can be scaled independently based on demand,
              optimizing resource utilization.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🛡️</div>
            <h4 className="font-semibold text-lg mb-2">Reliability</h4>
            <p className="text-gray-700 text-sm">
              Fault isolation and retry mechanisms ensure one failing service
              doesn't break the entire pipeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderArchitecture = () => (
    <div className="space-y-8">
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-blue-900 mb-6 flex items-center gap-3">
          🏗️ System Architecture Overview
        </h2>

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-blue-900 mb-4">
            🎯 Microservices Architecture
          </h3>
          <p className="text-blue-800 mb-6 leading-relaxed">
            Our system follows a distributed microservices pattern where each
            service has a single responsibility. Services communicate
            asynchronously through RabbitMQ message queues, ensuring loose
            coupling and high fault tolerance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              FFmpeg processing, Multi-quality encoding, HLS/DASH
            </p>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">💬</div>
            <h4 className="font-semibold text-lg mb-2">Captions</h4>
            <p className="text-sm text-gray-700">
              AWS Transcribe, SRT generation, Speech-to-text
            </p>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">🛡️</div>
            <h4 className="font-semibold text-lg mb-2">Censor</h4>
            <p className="text-sm text-gray-700">
              AI content analysis, Safety moderation, Gemini integration
            </p>
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-blue-900 mb-4">
            🔗 Component Interactions
          </h3>
          <div className="space-y-4 text-blue-800">
            <div className="flex items-center gap-4">
              <span className="bg-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                Frontend
              </span>
              <span className="text-gray-400">→</span>
              <span className="bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
                Gateway (GraphQL)
              </span>
              <span className="text-gray-400">→</span>
              <span className="bg-yellow-100 px-3 py-1 rounded-full text-sm font-medium">
                AWS S3
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
                Gateway
              </span>
              <span className="text-gray-400">→</span>
              <span className="bg-purple-100 px-3 py-1 rounded-full text-sm font-medium">
                RabbitMQ
              </span>
              <span className="text-gray-400">→</span>
              <span className="bg-red-100 px-3 py-1 rounded-full text-sm font-medium">
                Processing Services
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="bg-red-100 px-3 py-1 rounded-full text-sm font-medium">
                Services
              </span>
              <span className="text-gray-400">→</span>
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                PostgreSQL
              </span>
              <span className="text-gray-400">→</span>
              <span className="bg-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                Real-time Updates
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPipeline = () => (
    <div className="space-y-8">
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-green-900 mb-6 flex items-center gap-3">
          ⚡ Video Processing Pipeline
        </h2>

        <div className="space-y-6">
          <div className="bg-white border-l-4 border-blue-500 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-blue-900 mb-3 flex items-center gap-2">
              📤 Stage 1: Upload & Ingestion
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Process:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Chunked multipart upload to AWS S3</li>
                  <li>• Video metadata stored in PostgreSQL</li>
                  <li>• Upload progress tracking</li>
                  <li>• File validation and security checks</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Technologies:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• AWS S3 multipart upload API</li>
                  <li>• GraphQL mutations for metadata</li>
                  <li>• Drizzle ORM with PostgreSQL</li>
                  <li>• Real-time progress via subscriptions</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border-l-4 border-purple-500 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-purple-900 mb-3 flex items-center gap-2">
              🔄 Stage 2: Transcoding & Optimization
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Process:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• FFmpeg-based video processing</li>
                  <li>• Multiple quality renditions (480p, 720p, 1080p)</li>
                  <li>• HLS and DASH manifest generation</li>
                  <li>• Adaptive bitrate streaming preparation</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Output Formats:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• 1080p: 4000k bitrate, CRF 32</li>
                  <li>• 720p: 2500k bitrate, CRF 34</li>
                  <li>• 480p: 1200k bitrate, CRF 36</li>
                  <li>• HLS playlists for streaming</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border-l-4 border-orange-500 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-orange-900 mb-3 flex items-center gap-2">
              💬 Stage 3: Caption Generation
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Process:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Audio extraction from video</li>
                  <li>• AWS Transcribe speech-to-text</li>
                  <li>• SRT subtitle file generation</li>
                  <li>• Timestamp synchronization</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Features:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Automatic punctuation</li>
                  <li>• Speaker identification</li>
                  <li>• Multi-language support</li>
                  <li>• High accuracy transcription</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border-l-4 border-red-500 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-red-900 mb-3 flex items-center gap-2">
              🛡️ Stage 4: Content Moderation
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Process:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• AI-powered content analysis</li>
                  <li>• Caption text review</li>
                  <li>• Safety score calculation</li>
                  <li>• Automated flagging system</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">AI Integration:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Google Gemini AI model</li>
                  <li>• Custom prompts for safety</li>
                  <li>• Contextual understanding</li>
                  <li>• Batch processing optimization</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border-l-4 border-green-500 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-green-900 mb-3 flex items-center gap-2">
              🎉 Stage 5: Completion & Delivery
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Final Steps:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Status update to "Ready"</li>
                  <li>• CDN distribution</li>
                  <li>• Streaming URLs generation</li>
                  <li>• User notification</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Delivery:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Adaptive streaming ready</li>
                  <li>• Multiple quality options</li>
                  <li>• Subtitle integration</li>
                  <li>• Cross-platform compatibility</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServices = () => (
    <div className="space-y-8">
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-purple-900 mb-6 flex items-center gap-3">
          🔧 Microservices Deep Dive
        </h2>

        <div className="space-y-8">
          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              🌐 Gateway Service (Node.js/TypeScript)
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">
                  🎯 Core Responsibilities:
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>GraphQL API endpoint for all client operations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Multipart upload coordination with AWS S3</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Video metadata management and persistence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>RabbitMQ message publishing for pipeline events</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Real-time subscriptions for progress updates</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">⚙️ Technical Stack:</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong>Framework:</strong> Fastify with Mercurius GraphQL
                  </li>
                  <li>
                    <strong>Database:</strong> PostgreSQL with Drizzle ORM
                  </li>
                  <li>
                    <strong>Storage:</strong> AWS S3 SDK
                  </li>
                  <li>
                    <strong>Messaging:</strong> amqplib for RabbitMQ
                  </li>
                  <li>
                    <strong>Language:</strong> TypeScript for type safety
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-purple-900 mb-4 flex items-center gap-2">
              🔄 Transcoder Service (Go)
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">
                  🎯 Core Responsibilities:
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>FFmpeg-based video transcoding</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Multi-quality rendition generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>HLS and DASH manifest creation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Adaptive bitrate streaming preparation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Optimized encoding parameters per quality</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">⚙️ Technical Details:</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong>Language:</strong> Go for performance and
                    concurrency
                  </li>
                  <li>
                    <strong>Processing:</strong> FFmpeg with custom parameters
                  </li>
                  <li>
                    <strong>Output:</strong> H.264 video, AAC audio
                  </li>
                  <li>
                    <strong>Qualities:</strong> 1080p, 720p, 480p variants
                  </li>
                  <li>
                    <strong>Logging:</strong> Structured logging with Zap
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-orange-900 mb-4 flex items-center gap-2">
              💬 Captions Service (Go)
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">
                  🎯 Core Responsibilities:
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>AWS Transcribe job management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Speech-to-text conversion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>SRT subtitle file generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Timestamp accuracy and synchronization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Multi-language support capabilities</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">
                  ⚙️ Technical Integration:
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong>AI Service:</strong> AWS Transcribe API
                  </li>
                  <li>
                    <strong>Format:</strong> SRT subtitle generation
                  </li>
                  <li>
                    <strong>Storage:</strong> S3 for caption files
                  </li>
                  <li>
                    <strong>Processing:</strong> Asynchronous job handling
                  </li>
                  <li>
                    <strong>Quality:</strong> High-accuracy transcription
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-red-900 mb-4 flex items-center gap-2">
              🛡️ Censor Service (Go)
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">
                  🎯 Core Responsibilities:
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span>AI-powered content safety analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span>Caption text moderation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span>Inappropriate content detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span>Safety scoring and flagging</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span>Contextual understanding of content</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">⚙️ AI Integration:</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong>AI Model:</strong> Google Gemini for analysis
                  </li>
                  <li>
                    <strong>Prompts:</strong> Custom safety-focused prompts
                  </li>
                  <li>
                    <strong>Processing:</strong> Batch content analysis
                  </li>
                  <li>
                    <strong>Output:</strong> Safety scores and recommendations
                  </li>
                  <li>
                    <strong>Integration:</strong> RESTful API with Google AI
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTechStack = () => (
    <div className="space-y-8">
      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-indigo-900 mb-6 flex items-center gap-3">
          💻 Technology Stack & Infrastructure
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-indigo-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              🎨 Frontend Layer
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="bg-blue-100 p-2 rounded-lg text-lg">⚛️</span>
                <div>
                  <div className="font-semibold">React 18</div>
                  <div className="text-sm text-gray-600">
                    Component-based UI
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-purple-100 p-2 rounded-lg text-lg">📊</span>
                <div>
                  <div className="font-semibold">Apollo Client</div>
                  <div className="text-sm text-gray-600">
                    GraphQL state management
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-cyan-100 p-2 rounded-lg text-lg">🎨</span>
                <div>
                  <div className="font-semibold">Tailwind CSS v4</div>
                  <div className="text-sm text-gray-600">
                    Utility-first styling
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-orange-100 p-2 rounded-lg text-lg">📝</span>
                <div>
                  <div className="font-semibold">TypeScript</div>
                  <div className="text-sm text-gray-600">
                    Type-safe development
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-indigo-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
              🔧 Backend Services
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="bg-green-100 p-2 rounded-lg text-lg">🚀</span>
                <div>
                  <div className="font-semibold">Node.js + Fastify</div>
                  <div className="text-sm text-gray-600">
                    High-performance API
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-blue-100 p-2 rounded-lg text-lg">📈</span>
                <div>
                  <div className="font-semibold">GraphQL (Mercurius)</div>
                  <div className="text-sm text-gray-600">
                    Flexible API layer
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-cyan-100 p-2 rounded-lg text-lg">🐹</span>
                <div>
                  <div className="font-semibold">Go Microservices</div>
                  <div className="text-sm text-gray-600">
                    High-performance processing
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-purple-100 p-2 rounded-lg text-lg">🔄</span>
                <div>
                  <div className="font-semibold">FFmpeg</div>
                  <div className="text-sm text-gray-600">Video transcoding</div>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-indigo-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
              💾 Data & Storage
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="bg-blue-100 p-2 rounded-lg text-lg">🐘</span>
                <div>
                  <div className="font-semibold">PostgreSQL</div>
                  <div className="text-sm text-gray-600">Primary database</div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-green-100 p-2 rounded-lg text-lg">🗃️</span>
                <div>
                  <div className="font-semibold">Drizzle ORM</div>
                  <div className="text-sm text-gray-600">
                    Type-safe SQL queries
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-orange-100 p-2 rounded-lg text-lg">☁️</span>
                <div>
                  <div className="font-semibold">AWS S3</div>
                  <div className="text-sm text-gray-600">
                    Video & asset storage
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-red-100 p-2 rounded-lg text-lg">🐰</span>
                <div>
                  <div className="font-semibold">RabbitMQ</div>
                  <div className="text-sm text-gray-600">
                    Message queue system
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-indigo-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
              🤖 AI & Cloud Services
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="bg-blue-100 p-2 rounded-lg text-lg">🎤</span>
                <div>
                  <div className="font-semibold">AWS Transcribe</div>
                  <div className="text-sm text-gray-600">Speech-to-text AI</div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-purple-100 p-2 rounded-lg text-lg">🧠</span>
                <div>
                  <div className="font-semibold">Google Gemini</div>
                  <div className="text-sm text-gray-600">
                    Content moderation AI
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-green-100 p-2 rounded-lg text-lg">🌐</span>
                <div>
                  <div className="font-semibold">AWS CloudFront</div>
                  <div className="text-sm text-gray-600">
                    Global content delivery
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-red-100 p-2 rounded-lg text-lg">📊</span>
                <div>
                  <div className="font-semibold">CloudWatch</div>
                  <div className="text-sm text-gray-600">
                    Monitoring & logging
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-indigo-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
              🛠️ Development Tools
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="bg-blue-100 p-2 rounded-lg text-lg">⚡</span>
                <div>
                  <div className="font-semibold">Vite</div>
                  <div className="text-sm text-gray-600">Fast build tool</div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-purple-100 p-2 rounded-lg text-lg">🧪</span>
                <div>
                  <div className="font-semibold">ESLint</div>
                  <div className="text-sm text-gray-600">Code quality</div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-green-100 p-2 rounded-lg text-lg">📦</span>
                <div>
                  <div className="font-semibold">Go Modules</div>
                  <div className="text-sm text-gray-600">
                    Dependency management
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-orange-100 p-2 rounded-lg text-lg">🔍</span>
                <div>
                  <div className="font-semibold">Zap Logger</div>
                  <div className="text-sm text-gray-600">
                    Structured logging
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-indigo-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              🌐 Protocols & Standards
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="bg-red-100 p-2 rounded-lg text-lg">📺</span>
                <div>
                  <div className="font-semibold">HLS Streaming</div>
                  <div className="text-sm text-gray-600">
                    HTTP Live Streaming
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-blue-100 p-2 rounded-lg text-lg">🎬</span>
                <div>
                  <div className="font-semibold">DASH Protocol</div>
                  <div className="text-sm text-gray-600">
                    Dynamic Adaptive Streaming
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-green-100 p-2 rounded-lg text-lg">💬</span>
                <div>
                  <div className="font-semibold">SRT Subtitles</div>
                  <div className="text-sm text-gray-600">
                    SubRip text format
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="bg-purple-100 p-2 rounded-lg text-lg">🔐</span>
                <div>
                  <div className="font-semibold">WebSocket</div>
                  <div className="text-sm text-gray-600">
                    Real-time communication
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white border border-indigo-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-indigo-900 mb-4">
            🏗️ Architecture Benefits
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-green-900 mb-2">
                🚀 Performance
              </h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Go's concurrent processing for heavy workloads</li>
                <li>• FFmpeg optimization for fast transcoding</li>
                <li>• CDN distribution for global reach</li>
                <li>• Adaptive streaming for optimal bandwidth usage</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">
                🔧 Scalability
              </h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Independent service scaling</li>
                <li>• Message queue load balancing</li>
                <li>• Horizontal database scaling</li>
                <li>• Auto-scaling cloud infrastructure</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-purple-900 mb-2">
                🛡️ Reliability
              </h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Service isolation and fault tolerance</li>
                <li>• Retry mechanisms and error handling</li>
                <li>• Data consistency with ACID transactions</li>
                <li>• Comprehensive monitoring and alerting</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMessaging = () => (
    <div className="space-y-8">
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-yellow-900 mb-6 flex items-center gap-3">
          📡 Message Flow & Event-Driven Architecture
        </h2>

        <div className="space-y-8">
          <div className="bg-white border border-yellow-200 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-yellow-900 mb-4">
              🔄 Event Flow Diagram
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Upload Complete
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    videoUploaded
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Transcoder
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Transcoding Done
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    videoTranscoded
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Captions
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Captions Ready
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    startCensor
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Censor
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Censoring Complete
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    updateVideoStatus
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Frontend
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-yellow-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-purple-900 mb-4">
                🎯 Message Types
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-blue-900">videoUploaded</h4>
                  <p className="text-sm text-gray-600">
                    Triggers transcoding process
                  </p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {"{ videoId, s3Key, bucketName }"}
                  </code>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-green-900">
                    videoTranscoded
                  </h4>
                  <p className="text-sm text-gray-600">
                    Triggers caption generation
                  </p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {"{ videoId, manifestKey }"}
                  </code>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-orange-900">startCensor</h4>
                  <p className="text-sm text-gray-600">
                    Triggers content moderation
                  </p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {"{ videoId, srtKey }"}
                  </code>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-semibold text-red-900">
                    updateVideoStatus
                  </h4>
                  <p className="text-sm text-gray-600">
                    Updates video processing state
                  </p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {"{ videoId, phase, status }"}
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-white border border-yellow-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-yellow-900 mb-4">
                ⚙️ Queue Configuration
              </h3>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded p-3">
                  <h4 className="font-semibold text-gray-900">
                    Exchange:{" "}
                    <span className="text-blue-600">newVideoUploaded</span>
                  </h4>
                  <p className="text-sm text-gray-600">
                    Type: Topic-based routing
                  </p>
                  <p className="text-sm text-gray-600">
                    Durable: Yes (survives restarts)
                  </p>
                </div>
                <div className="border border-gray-200 rounded p-3">
                  <h4 className="font-semibold text-gray-900">
                    Queues per Service:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1 mt-2">
                    <li>
                      • <strong>transcodingRequest</strong> - Video processing
                    </li>
                    <li>
                      • <strong>captionsRequest</strong> - Subtitle generation
                    </li>
                    <li>
                      • <strong>censorRequest</strong> - Content moderation
                    </li>
                    <li>
                      • <strong>statusUpdates</strong> - State management
                    </li>
                  </ul>
                </div>
                <div className="border border-gray-200 rounded p-3">
                  <h4 className="font-semibold text-gray-900">
                    Quality of Service:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1 mt-2">
                    <li>• Prefetch Count: 5 messages</li>
                    <li>• Manual acknowledgment</li>
                    <li>• Retry with exponential backoff</li>
                    <li>• Dead letter queues for failed messages</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-yellow-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-yellow-900 mb-4">
              🔄 Error Handling & Resilience
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-red-900 mb-3">
                  🚨 Failure Scenarios
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Service crashes during processing</li>
                  <li>• AWS API rate limiting</li>
                  <li>• Network connectivity issues</li>
                  <li>• Invalid or corrupted video files</li>
                  <li>• AI service temporary unavailability</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-3">
                  🔧 Recovery Mechanisms
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Message acknowledgment on success only</li>
                  <li>• Exponential backoff for retries</li>
                  <li>• Circuit breaker for external APIs</li>
                  <li>• Graceful degradation for non-critical features</li>
                  <li>• Manual intervention for persistent failures</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-900 mb-3">
                  📊 Monitoring & Alerts
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Queue depth monitoring</li>
                  <li>• Processing time metrics</li>
                  <li>• Error rate tracking</li>
                  <li>• Service health checks</li>
                  <li>• Resource utilization alerts</li>
                </ul>
              </div>
            </div>
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
      case "services":
        return renderServices();
      case "tech-stack":
        return renderTechStack();
      case "messaging":
        return renderMessaging();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
          🔍 Deep Dive: Video Engine Architecture
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Explore the comprehensive technical architecture behind our
          intelligent video processing platform
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-8 shadow-lg">
        <div className="flex flex-wrap justify-center gap-3">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 border-2 flex items-center gap-2 text-sm lg:text-base ${
                activeSection === section.id
                  ? "bg-red-500 text-white border-red-500 shadow-lg transform scale-105"
                  : "bg-white text-gray-700 border-gray-300 hover:border-red-300 hover:bg-red-50 hover:transform hover:scale-105"
              }`}
            >
              <span className="text-lg">{section.icon}</span>
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="transition-all duration-500 ease-in-out">
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="mt-12 bg-gray-900 text-white rounded-xl p-8 text-center">
        <h3 className="text-2xl font-bold mb-4">🚀 Ready to Process Videos?</h3>
        <p className="text-gray-300 mb-6">
          Experience the power of our intelligent video processing pipeline in
          action!
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
          >
            📤 Upload a Video
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
          >
            📹 View All Videos
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeepDive;
