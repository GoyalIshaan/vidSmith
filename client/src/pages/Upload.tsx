import React, { useState } from "react";
import FileSelector from "../components/FileSelector";
import { usePageTitle } from "../hooks/usePageTitle";
import FileForm from "../components/FileForm";
import UploadProgress from "../components/UploadProgress";
import StatusMessage from "../components/StatusMessage";
import { useVideoStore } from "../store/videoStore";

const Upload: React.FC = () => {
  usePageTitle("Upload Video");

  // Use Zustand store for all upload state
  const {
    isUploading,
    uploadProgress,
    uploadStatus,
    uploadError,
    uploadVideo,
    abortUpload,
    resetUpload,
  } = useVideoStore();

  // Local UI state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setVideoTitle(file.name.split(".").slice(0, -1).join("."));
    setLocalError("");
    resetUpload(); // Clear any previous upload state
  };

  const handleError = (errorMessage: string) => {
    setLocalError(errorMessage);
  };

  const handleTitleChange = (title: string) => {
    setVideoTitle(title);
  };

  const handleSubmitUpload = async () => {
    if (!selectedFile) {
      setLocalError("Please select a video file first");
      return;
    }

    if (!videoTitle.trim()) {
      setLocalError("Please enter a video title");
      return;
    }

    try {
      setLocalError("");

      // Use the Zustand store upload function
      await uploadVideo(selectedFile, videoTitle.trim());

      // Reset local state for next upload
      setSelectedFile(null);
      setVideoTitle("");
    } catch (err) {
      console.error("Upload error:", err);
      // Error is handled by the store, but we can also set local error if needed
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setVideoTitle("");
    setLocalError("");
    resetUpload();
  };

  const handleAbort = async () => {
    await abortUpload();
  };

  return (
    <div className="w-full max-w-none">
      <h1 className="text-center text-gray-900 text-4xl font-semibold mb-8">
        Video Upload
      </h1>

      {!selectedFile && !isUploading && (
        <FileSelector
          onFileSelect={handleFileSelect}
          onError={handleError}
          disabled={isUploading}
        />
      )}

      {selectedFile && !isUploading && (
        <FileForm
          file={selectedFile}
          onRemoveFile={handleRemoveFile}
          onTitleChange={handleTitleChange}
          onSubmit={handleSubmitUpload}
          initialTitle={videoTitle}
        />
      )}

      {isUploading && (
        <UploadProgress
          progress={uploadProgress}
          status={uploadStatus}
          fileName={videoTitle || selectedFile?.name || ""}
          onAbort={handleAbort}
        />
      )}

      {uploadStatus && !isUploading && (
        <StatusMessage
          type="success"
          title="Upload Complete!"
          message={uploadStatus}
        />
      )}

      {(uploadError || localError) && (
        <StatusMessage
          type="error"
          title="Upload Failed"
          message={uploadError || localError}
        />
      )}
    </div>
  );
};

export default Upload;
