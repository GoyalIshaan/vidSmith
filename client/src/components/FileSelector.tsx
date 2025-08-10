import React, { useState, useRef, useCallback } from "react";

interface FileSelectorProps {
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

const FileSelector: React.FC<FileSelectorProps> = ({
  onFileSelect,
  onError,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const videoFile = files.find((file) => file.type.startsWith("video/"));

      if (videoFile) {
        onFileSelect(videoFile);
      } else {
        onError("Please select a valid video file");
      }
    },
    [onFileSelect, onError]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith("video/")) {
        onFileSelect(file);
      } else if (file) {
        onError("Please select a valid video file");
      }
    },
    [onFileSelect, onError]
  );

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getUploadAreaClasses = () => {
    let classes =
      "border-3 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 bg-white min-h-[300px] flex items-center justify-center relative overflow-hidden ";

    if (isDragOver) {
      classes += "border-red-500 scale-105 shadow-red-200 shadow-xl ";
    } else if (disabled) {
      classes += "border-red-500 cursor-default ";
    } else {
      classes +=
        "border-gray-300 hover:border-red-500 hover:-translate-y-1 hover:shadow-red-200 hover:shadow-lg ";
    }

    return classes;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className={getUploadAreaClasses()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="text-6xl animate-bounce">📹</div>
          <h3 className="text-gray-900 text-2xl font-semibold">
            Drop your video here
          </h3>
          <p className="text-gray-700 text-lg">or click to browse</p>
          <p className="text-gray-500 text-sm italic">
            Supports MP4, MOV, AVI, and other video formats
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileSelector;
