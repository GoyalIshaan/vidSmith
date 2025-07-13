import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import type { Video } from "../types/graphql";
import "./VideoList.css";

const GET_VIDEOS = gql`
  query GetVideos {
    videos {
      id
      videoName
      status
      s3Key
      bucketName
      captionsKey
      createdAt
    }
  }
`;

const VideoList: React.FC = () => {
  const { loading, error, data, refetch } = useQuery(GET_VIDEOS);
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (data?.videos) {
      setVideos(data.videos);
    }
  }, [data]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UPLOADING":
        return "#f39c12";
      case "TRANSCODING":
        return "#3498db";
      case "READY":
        return "#27ae60";
      case "ERROR":
        return "#e74c3c";
      default:
        return "#95a5a6";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "UPLOADING":
        return "⏳";
      case "TRANSCODING":
        return "🔄";
      case "READY":
        return "✅";
      case "ERROR":
        return "❌";
      default:
        return "❓";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="video-list-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-list-container">
        <div className="error">
          <p>❌ Error loading videos: {error.message}</p>
          <button onClick={handleRefresh} className="refresh-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-list-container">
      <div className="video-list-header">
        <h2>Uploaded Videos</h2>
        <button onClick={handleRefresh} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📹</div>
          <h3>No videos uploaded yet</h3>
          <p>Upload your first video to get started!</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card">
              <div className="video-header">
                <div className="video-name">{video.videoName}</div>
                <div
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(video.status) }}
                >
                  {getStatusIcon(video.status)} {video.status}
                </div>
              </div>

              <div className="video-details">
                <div className="detail-item">
                  <span className="label">ID:</span>
                  <span className="value">{video.id}</span>
                </div>

                <div className="detail-item">
                  <span className="label">Uploaded:</span>
                  <span className="value">{formatDate(video.createdAt)}</span>
                </div>

                {video.s3Key && (
                  <div className="detail-item">
                    <span className="label">S3 Key:</span>
                    <span className="value s3-key">{video.s3Key}</span>
                  </div>
                )}

                {video.bucketName && (
                  <div className="detail-item">
                    <span className="label">Bucket:</span>
                    <span className="value">{video.bucketName}</span>
                  </div>
                )}

                {video.captionsKey && (
                  <div className="detail-item">
                    <span className="label">Captions:</span>
                    <span className="value s3-key">{video.captionsKey}</span>
                  </div>
                )}
              </div>

              {video.status === "READY" && video.s3Key && (
                <div className="video-actions">
                  <button className="play-button">▶️ Play Video</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoList;
