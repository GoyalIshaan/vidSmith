import React, { useState, useEffect } from "react";

interface FileFormProps {
  file: File;
  onRemoveFile: () => void;
  onTitleChange: (title: string) => void;
  onSubmit: () => void;
  initialTitle?: string;
}

const FileForm: React.FC<FileFormProps> = ({
  file,
  onRemoveFile,
  onTitleChange,
  onSubmit,
  initialTitle = "",
}) => {
  const [videoTitle, setVideoTitle] = useState(initialTitle);

  useEffect(() => {
    setVideoTitle(initialTitle);
  }, [initialTitle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setVideoTitle(newTitle);
    onTitleChange(newTitle);
  };

  const handleSubmit = () => {
    if (videoTitle.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <h3 className="text-gray-900 text-xl font-semibold mb-6">
          Ready to Upload
        </h3>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 font-medium">Selected File:</p>
              <p className="text-gray-600 text-sm">{file.name}</p>
              <p className="text-gray-500 text-xs">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={onRemoveFile}
              className="text-red-500 hover:text-red-700 font-medium text-sm"
            >
              Remove
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label
            htmlFor="videoTitle"
            className="block text-gray-900 font-semibold mb-2"
          >
            Video Title:
          </label>
          <input
            id="videoTitle"
            type="text"
            value={videoTitle}
            onChange={handleTitleChange}
            placeholder="Enter a title for your video"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            maxLength={100}
          />
          <p className="text-gray-500 text-xs mt-1">
            {videoTitle.length}/100 characters
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!videoTitle.trim()}
          className={`w-full py-4 px-6 rounded-lg text-lg font-semibold transition-all duration-300 ${
            videoTitle.trim()
              ? "bg-red-500 hover:bg-red-600 text-white transform hover:-translate-y-0.5 shadow-lg"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          🚀 Upload Video
        </button>
      </div>
    </div>
  );
};

export default FileForm;
