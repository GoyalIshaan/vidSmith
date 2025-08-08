import React from "react";

interface VideoPipelineProps {
  status: number;
  videoName: string;
}

const VideoPipeline: React.FC<VideoPipelineProps> = ({ status, videoName }) => {
  const getPhaseStatus = (phase: string) => {
    switch (phase) {
      case "upload":
        return status >= 0 ? "completed" : "pending";
      case "transcoding":
        return status >= 1 ? "completed" : status === 0 ? "active" : "pending";
      case "packaging":
        // Packaging happens right after transcoding completes. We treat it as active when status === 1
        // and completed once captioning has moved the status forward (>= 2)
        return status >= 2 ? "completed" : status === 1 ? "active" : "pending";
      case "captioning":
        return status >= 2 ? "completed" : status === 1 ? "active" : "pending";
      case "censoring":
        return status >= 5
          ? "completed"
          : status === 4 || status === 3 || status === 2
          ? "active"
          : "pending";
      case "done":
        return status === 6 ? "completed" : "pending";
      default:
        return "pending";
    }
  };

  const getPhaseIcon = (phase: string) => {
    const phaseStatus = getPhaseStatus(phase);
    switch (phase) {
      case "upload":
        return phaseStatus === "completed" ? "✅" : "📤";
      case "transcoding":
        return phaseStatus === "completed"
          ? "✅"
          : phaseStatus === "active"
          ? "🔄"
          : "⏳";
      case "packaging":
        return phaseStatus === "completed"
          ? "✅"
          : phaseStatus === "active"
          ? "📦"
          : "⏳";
      case "captioning":
        return phaseStatus === "completed"
          ? "✅"
          : phaseStatus === "active"
          ? "🔄"
          : "⏳";
      case "censoring":
        return phaseStatus === "completed"
          ? "✅"
          : phaseStatus === "active"
          ? "🔄"
          : "⏳";
      case "done":
        return phaseStatus === "completed" ? "🎉" : "⏳";
      default:
        return "⏳";
    }
  };

  const getPhaseClasses = (phase: string) => {
    const phaseStatus = getPhaseStatus(phase);
    const baseClasses =
      "flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-300";

    switch (phaseStatus) {
      case "completed":
        return `${baseClasses} bg-green-50 border-green-500 text-green-700`;
      case "active":
        return `${baseClasses} bg-red-50 border-red-500 text-red-700 animate-pulse`;
      case "pending":
        return `${baseClasses} bg-gray-50 border-gray-300 text-gray-500`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-300 text-gray-500`;
    }
  };

  // All phases in one horizontal line
  const phases = [
    { key: "upload", label: "Upload", description: "File uploaded" },
    {
      key: "transcoding",
      label: "Transcoding",
      description: "Video processing",
    },
    {
      key: "captioning",
      label: "Captioning",
      description: "Generating subtitles",
    },
    {
      key: "packaging",
      label: "Packaging",
      description: "Preparing manifests",
    },
    { key: "censoring", label: "Censoring", description: "Content review" },
    { key: "done", label: "Done", description: "Ready to play" },
  ];

  return (
    <div className="bg-white border border-black rounded-xl p-6 mt-4">
      <h4 className="text-black font-semibold mb-4 flex items-center gap-2">
        🚀 Processing Pipeline: {videoName}
      </h4>

      {/* All phases in one horizontal line */}
      <div className="flex items-center justify-between">
        {phases.map((phase, index) => (
          <React.Fragment key={phase.key}>
            <div className={getPhaseClasses(phase.key)}>
              <div className="text-2xl mb-2">{getPhaseIcon(phase.key)}</div>
              <div className="font-semibold text-sm">{phase.label}</div>
              <div className="text-xs text-center mt-1">
                {phase.description}
              </div>
            </div>

            {index < phases.length - 1 && (
              <div className="w-8 h-0.5 bg-gray-300"></div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600">
          Status: {status} | Current Phase:{" "}
          {status === 6
            ? "Complete"
            : status === 5
            ? "Processing Final"
            : status === 3
            ? "Censoring"
            : status === 2
            ? "Captioning Done"
            : status === 1
            ? "Packaging"
            : status === 0
            ? "Uploaded"
            : "Error"}
        </div>
      </div>
    </div>
  );
};

export default VideoPipeline;
