# FrameKit — Product Requirements

## 1. Overview

**FrameKit** is a lightweight web-based media utility that allows users to extract images/frames from video files.

The core principle is:

> Upload → Process → Download → Delete

FrameKit should not require user accounts and should not permanently store uploaded videos.

The initial product focuses on **Video → Image**, while the architecture should allow additional media tools to be added in the future.

---

## 2. Goals

### Primary Goals

* Convert video files into images/frames.
* Allow users to select exactly which frames they want.
* Support extracting a single frame or multiple frames.
* Provide an easy-to-use drag-and-drop interface.
* Allow users to download extracted images individually or as a ZIP.
* Minimize upload and processing friction.
* Do not permanently store user videos or extracted images.
* Work well on desktop and mobile browsers.

### Secondary Goals

Design the system so future tools can be added without major architectural changes.

Potential future tools:

* Video → GIF
* Video → WebP
* Contact Sheet Generator
* Video Thumbnail Generator
* Image Converter
* Image Compressor
* Image Resizer
* Scene Detection
* Smart Frame Extraction

---

# 3. Core User Flow

```text
User
  ↓
Open FrameKit
  ↓
Select / Drop Video
  ↓
Video Preview
  ↓
Configure Extraction
  ↓
Process Video
  ↓
Preview Extracted Frames
  ↓
Download Image(s)
  ↓
Temporary Data Deleted
```

No account or login should be required for the MVP.

---

# 4. MVP Features

## 4.1 Video Upload

Users can upload a video using:

* Drag & drop
* File picker

Supported formats should include common video formats such as:

* MP4
* WebM
* MOV
* AVI
* MKV

The actual supported formats depend on the selected processing technology.

### Requirements

* Show selected filename.
* Show file size.
* Show video duration after processing metadata.
* Show a clear upload error when the file is unsupported.
* Show a clear error when the file exceeds the configured maximum size.

---

## 4.2 Video Preview

After selecting a video, display:

* Video player
* Duration
* Current timestamp
* Video dimensions
* File size

Users should be able to seek through the video before selecting frames.

Example:

```text
┌──────────────────────────────────────┐
│                                      │
│             Video Preview            │
│                                      │
└──────────────────────────────────────┘

00:12 / 01:35

[────────────●───────────────────────]
```

---

# 5. Frame Extraction Modes

The MVP should support multiple extraction modes.

## 5.1 Capture Current Frame

Extract the frame at the current video timestamp.

Example:

```text
Video
  ↓
00:14.250
  ↓
Capture Frame
```

The user should be able to download the captured frame immediately.

---

## 5.2 Extract by Interval

Users can specify an interval.

Example:

```text
Start:    00:00
End:      01:00
Interval: 5 seconds
```

Result:

```text
00:00
00:05
00:10
00:15
...
01:00
```

---

## 5.3 Extract by Frame Count

Optional MVP feature.

Example:

```text
Start: 00:00
End:   01:00
Frames: 10
```

FrameKit distributes the extraction points across the selected range.

---

# 6. Extraction Settings

Users should be able to configure:

### Output Format

* JPG
* PNG
* WebP

### Image Quality

For lossy formats:

* Quality slider
* Default quality should provide a reasonable balance between file size and quality.

### Resolution

Options:

* Original
* 1920px
* 1280px
* 720px
* Custom

The system should preserve aspect ratio.

---

# 7. Extracted Frame Preview

After extraction, display the resulting frames in a grid.

Example:

```text
Extracted Frames

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Frame 1│ │ Frame 2│ │ Frame 3│ │ Frame 4│
│        │ │        │ │        │ │        │
└────────┘ └────────┘ └────────┘ └────────┘
  00:00      00:05      00:10      00:15
```

Each frame should display:

* Preview
* Timestamp
* Filename
* Download button

Users should be able to remove individual frames before downloading.

---

# 8. Download

## 8.1 Download Single Image

Each frame should have a download action.

Example filename:

```text
frame-00001.webp
```

---

## 8.2 Download All

Users can download all selected frames as a ZIP.

Example:

```text
framekit-frames.zip

├── frame-00001.webp
├── frame-00002.webp
├── frame-00003.webp
└── ...
```

---

# 9. Privacy & Temporary Data

Privacy should be a core product principle.

FrameKit should not permanently store:

* Uploaded videos
* Extracted images
* Generated ZIP files
* User information

Temporary files should be deleted after processing is complete or after a short automatic cleanup period.

The exact implementation depends on whether processing happens:

1. Entirely in the browser
2. On a temporary backend worker
3. Through a hybrid architecture

If browser-side processing is technically feasible for a given operation, prefer browser-side processing to reduce server-side handling of user files.

---

# 10. User Interface

## Homepage

The homepage should immediately communicate the primary function.

Suggested structure:

```text
FrameKit

Extract frames from your videos.

No account. No permanent storage.

┌─────────────────────────────────────┐
│                                     │
│       Drop your video here          │
│                                     │
│       or choose a file              │
│                                     │
└─────────────────────────────────────┘

Video → Image
```

The UI should be:

* Minimal
* Fast
* Responsive
* Mobile-friendly
* Easy to understand without instructions

Avoid unnecessary signup flows, dashboards, or complex navigation in the MVP.

---

# 11. Processing States

The UI should clearly communicate the current state.

### Uploading

```text
Uploading...
██████████████░░░░░░ 70%
```

### Processing

```text
Extracting frames...

Frame 24 / 120
████████████████░░░░
```

### Complete

```text
Done!

120 frames extracted.

[Download All]
```

### Error

Errors should explain what happened and what the user can do next.

Example:

```text
We couldn't process this video.

The video format may not be supported.

[Choose Another Video]
```

---

# 12. Limits

The system should define configurable limits for:

* Maximum video file size
* Maximum video duration
* Maximum number of extracted frames
* Maximum processing time
* Maximum concurrent jobs

These values should be configurable without changing the application logic.

Example initial limits:

```text
Max file size:       500 MB
Max duration:        30 minutes
Max extracted frames: 500
```

These are initial defaults and should be adjusted based on actual infrastructure and processing performance.

---

# 13. Error Handling

The system should handle at least:

* Unsupported file format
* Corrupted video
* File too large
* Video too long
* Processing timeout
* Browser memory limitations
* Server processing failure
* Network interruption
* ZIP generation failure
* Unsupported codec

Errors should never expose internal stack traces to users.

---

# 14. Performance

FrameKit should optimize for fast perceived performance.

Requirements:

* Show immediate video metadata when possible.
* Display processing progress.
* Avoid loading all extracted full-resolution images into browser memory at once when unnecessary.
* Generate thumbnails for frame previews where possible.
* Process large videos efficiently.
* Clean up temporary resources after completion.

For browser-side processing, avoid unnecessary copies of large video buffers.

---

# 15. Architecture

The application should separate the following concerns:

```text
UI
 │
 ├── Upload
 ├── Video Preview
 ├── Extraction Settings
 ├── Frame Preview
 └── Download
       │
       ▼
Media Processing Layer
       │
       ├── Frame Extraction
       ├── Image Conversion
       ├── Resize
       └── ZIP Generation
```

The Media Processing Layer should be designed as a reusable module.

Future tools should be able to reuse the same processing infrastructure.

Example:

```text
Media Processing

├── VideoToImage
├── VideoToGif
├── VideoToWebP
├── ContactSheet
├── ImageConvert
├── ImageResize
└── ImageCompress
```

---

# 16. Future Product Structure

FrameKit can eventually become a collection of media utilities.

```text
FrameKit

Video
├── Video → Image
├── Video → GIF
├── Video → WebP
├── Extract Frames
├── Contact Sheet
└── Thumbnail Generator

Image
├── Image Converter
├── Image Compressor
├── Image Resizer
├── Image Cropper
└── Image Optimizer
```

Each tool should have its own URL for SEO and direct access.

Example:

```text
/frame-extractor
/video-to-image
/video-to-gif
/video-to-webp
/contact-sheet
/image-converter
/image-compressor
```

---

# 17. SEO

Each tool should have a dedicated landing page.

The initial target:

```text
/video-to-image
```

Potential future pages:

```text
/video-frame-extractor
/extract-frames-from-video
/video-to-jpg
/video-to-png
/video-to-webp
/video-to-gif
/video-thumbnail-generator
/contact-sheet-generator
```

Pages should provide useful explanatory content rather than being generated solely for keyword targeting.

---

# 18. Analytics

Analytics should avoid collecting uploaded media content.

Track only useful product events such as:

```text
page_view
upload_started
upload_completed
extraction_started
extraction_completed
download_single
download_all
processing_error
```

Do not collect or store the actual video contents as analytics data.

---

# 19. Security

The system must treat uploaded files as untrusted input.

Requirements:

* Validate file type.
* Validate file size.
* Sanitize filenames.
* Isolate media processing where appropriate.
* Prevent arbitrary file execution.
* Prevent path traversal.
* Automatically remove temporary files.
* Rate-limit abusive requests.
* Do not expose temporary file URLs longer than necessary.

If server-side processing is used, media processing should ideally run in an isolated worker/container.

---

# 20. Monetization — Future

Monetization should not be implemented until the core product is validated.

Possible future models:

### Free

* Limited file size
* Limited processing duration
* Standard formats

### Pro

* Larger files
* Longer videos
* Batch processing
* Higher resolution
* Advanced extraction
* Priority processing

Potential advertising can also be considered for free users, but should not significantly interfere with the core tool.

---

# 21. MVP Success Criteria

The MVP is considered successful when a new user can:

1. Open FrameKit.
2. Select a video.
3. Preview the video.
4. Select an extraction method.
5. Extract frames.
6. Preview the frames.
7. Download one or all frames.
8. Finish without creating an account.
9. Understand that the uploaded file is not permanently stored.

The entire workflow should require minimal configuration for a first-time user.

---

# 22. Product Principle

FrameKit should follow three principles:

### Simple

The user should not need to understand video codecs, FFmpeg, frame rates, or technical details to use the basic tool.

### Fast

The shortest path from video to downloaded image should be the default experience.

### Private

User media should be treated as temporary data, not as content to be stored.

> **FrameKit — Simple tools for your media.**
