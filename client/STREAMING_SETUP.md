# Video Streaming Setup Guide

## Overview
This client now includes a fully functional video player with HLS and MPEG-DASH adaptive bitrate streaming support using Video.js.

## Environment Variables

Create a `.env` file in the client directory with the following variables:

```bash
# Video Streaming Configuration
VITE_CDN_BASE_URL=https://your-cdn-domain.com
VITE_PACKAGED_PREFIX=packaged

# GraphQL Endpoint  
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

## URL Structure

The video player expects the following URL structure based on your backend:

**HLS Master Playlist:**
`{VITE_CDN_BASE_URL}/{VITE_PACKAGED_PREFIX}/{videoId}/hls/master.m3u8`

**DASH Manifest:**
`{VITE_CDN_BASE_URL}/{VITE_PACKAGED_PREFIX}/{videoId}/dash/master.mpd`

## Features

✅ **Adaptive Bitrate Streaming**: Automatically adjusts quality based on network conditions
✅ **Multiple Formats**: Supports both HLS and MPEG-DASH
✅ **Quality Levels**: 1080p, 720p, and 480p renditions
✅ **User Controls**: Play/pause, seek, volume, fullscreen, playback rate
✅ **Responsive Design**: Works on desktop and mobile
✅ **Error Handling**: Graceful fallbacks and retry mechanisms

## Usage

The video player will automatically appear in the VideoDetails component when:
- Video status is 6 (READY)
- The video has been fully processed through the pipeline

## Development

For local development, the player defaults to `http://localhost:8080` as the CDN base URL. Make sure your CDN or local server is serving the packaged video content at this endpoint.

## Troubleshooting

1. **Video not loading**: Check that the CDN_BASE_URL is correctly configured and accessible
2. **CORS issues**: Ensure your CDN/server has proper CORS headers for video streaming
3. **Network errors**: Check browser dev tools for failed network requests to streaming URLs
