# Media Management

The `client.media` module manages file uploads, metadata lookups, and deletions.

---

## Lifecycle Methods

```typescript
import { readFile } from "node:fs/promises";

// 1. Upload a file as a Blob
const fileBuffer = await readFile("./receipt.pdf");
const { id } = await client.media.upload({
  file: new Blob([fileBuffer], { type: "application/pdf" }),
  mimeType: "application/pdf",
  filename: "receipt.pdf",
});

// 2. Retrieve metadata (including temporary download URL)
const metadata = await client.media.retrieve(id);
console.log(metadata.url, metadata.file_size, metadata.mime_type);

// 3. Delete media when finished
const { success } = await client.media.delete(id);
console.log("Deleted:", success);
```

---

## Supported Media Types and Limits

| Category | MIME Types | Maximum Size |
| :--- | :--- | :--- |
| **Images** | `image/jpeg`, `image/png` | 5 MB |
| **Audio** | `audio/aac`, `audio/amr`, `audio/mpeg`, `audio/mp4`, `audio/ogg` | 16 MB |
| **Video** | `video/mp4`, `video/3gpp` | 16 MB |
| **Documents** | `application/pdf`, `text/plain`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx` | 100 MB |

> [!TIP]
> **Media Format Advice:**
> - Video files should use H.264 video encoding with AAC audio (or no audio track).
> - OGG audio should use mono Opus.
> - For large documents near 100 MB, leave headroom for multipart boundary overhead.

---

## Downloading Media

The URL returned by `client.media.retrieve(mediaId)` is a protected Meta URL that requires authentication with your Meta Bearer token:

```typescript
const { url } = await client.media.retrieve(mediaId);

const response = await fetch(url, {
  headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
});

const arrayBuffer = await response.arrayBuffer();
```
