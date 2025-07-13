# Video Upload Client

A modern React + TypeScript + Vite client for uploading videos using multipart uploads to your video processing backend.

## Features

- 🎬 **Multipart Video Upload**: Upload large video files in chunks for better reliability
- 📤 **Drag & Drop Interface**: Modern drag-and-drop file upload with visual feedback
- 📊 **Real-time Progress**: Track upload progress with detailed part-by-part status
- 📹 **Video Management**: View all uploaded videos with their processing status
- 🎨 **Modern UI**: Beautiful, responsive design with smooth animations
- 🔄 **GraphQL Integration**: Uses Apollo Client for efficient data fetching
- 📱 **Mobile Responsive**: Works perfectly on desktop and mobile devices

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Apollo Client** - GraphQL client
- **CSS3** - Modern styling with animations

## Getting Started

### Prerequisites

- Node.js 18+
- Your video processing backend running on `http://localhost:3000`

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

### Uploading Videos

1. Click on the "📤 Upload Video" tab
2. Drag and drop a video file onto the upload area or click to browse
3. The client will automatically:
   - Initiate a multipart upload
   - Split the file into 5MB chunks
   - Upload each chunk with progress tracking
   - Complete the upload when finished

### Viewing Videos

1. Click on the "📹 My Videos" tab
2. View all uploaded videos with their current status:
   - **UPLOADING**: File is being uploaded
   - **TRANSCODING**: Video is being processed
   - **READY**: Video is ready for playback
   - **ERROR**: Something went wrong

## API Integration

The client integrates with your GraphQL backend using the following mutations:

- `initiateMultipartUpload` - Start a new multipart upload
- `generateUploadPartUrl` - Get presigned URLs for each chunk
- `completeMultipartUpload` - Finalize the upload
- `abortMultipartUpload` - Cancel an upload in progress

And queries:

- `videos` - Get all uploaded videos

## Configuration

The client is configured to connect to your backend at `http://localhost:3000/graphql`. To change this, update the URI in `src/lib/apollo.ts`:

```typescript
const httpLink = createHttpLink({
  uri: "http://your-backend-url:port/graphql",
});
```

## File Structure

```
src/
├── components/
│   ├── VideoUpload.tsx      # Main upload component
│   ├── VideoUpload.css      # Upload component styles
│   ├── VideoList.tsx        # Video list component
│   └── VideoList.css        # Video list styles
├── lib/
│   ├── apollo.ts           # Apollo Client configuration
│   └── uploadService.ts    # Upload logic and GraphQL mutations
├── types/
│   └── graphql.ts          # TypeScript types for GraphQL schema
├── App.tsx                 # Main app component
└── App.css                 # App styles
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. **New Components**: Add them to the `src/components/` directory
2. **New Types**: Add them to `src/types/graphql.ts`
3. **New Services**: Add them to `src/lib/` directory
4. **Styling**: Use CSS modules or add styles to component-specific CSS files

## Troubleshooting

### Common Issues

1. **Connection Error**: Make sure your backend is running on `http://localhost:3000`
2. **CORS Issues**: Ensure your backend allows requests from `http://localhost:5173`
3. **Upload Fails**: Check that your AWS credentials are properly configured in the backend

### Debug Mode

Enable debug logging by opening the browser console. The client logs detailed information about:

- Upload progress
- GraphQL requests/responses
- Error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the Video Engine system.
