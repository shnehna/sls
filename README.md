# ShadowCast — English Podcast Shadow Reader

ShadowCast is a React + TypeScript podcast player for English listening and speaking practice. It uses the PodcastIndex.org API to discover podcasts and episodes, then combines audio playback with synced transcripts for shadow reading.

## Features

- Search podcasts with PodcastIndex `/search/byterm`
- Browse podcast details and episode lists
- Play podcast audio with custom controls
- Parse transcripts from SRT, VTT, JSON, HTML, and plain text
- Highlight the active transcript cue while audio plays
- Distinguish speakers when transcript labels or PodcastIndex `persons` metadata are available
- Shadow reading controls:
  - cue-by-cue navigation
  - repeat current cue
  - loop current cue
  - playback speed presets
  - keyboard shortcuts
- Vite dev proxy for PodcastIndex auth headers and transcript CORS

## Setup

The local development proxy reads credentials from `.env.local`:

```bash
PODCAST_INDEX_KEY=your_key
PODCAST_INDEX_SECRET=your_secret
```

This file is intentionally ignored by git. The current project already includes a local `.env.local` for this workspace using the credentials you supplied.

Install dependencies and run:

```bash
npm install
npm run dev
```

Open the Vite URL, usually:

```text
http://localhost:5173
```

## Important security note

PodcastIndex authentication requires a secret. This app uses a Vite development proxy so the secret is not embedded in browser source code. For production deployment, add a server/API route that implements the same proxy behavior:

- browser calls your backend `/api/podcastindex/...`
- backend injects `X-Auth-Date`, `X-Auth-Key`, and `Authorization`
- backend forwards the request to `https://api.podcastindex.org/api/1.0/...`

Do not ship PodcastIndex secrets in static frontend bundles.

## Practice workflow

1. Search for a podcast topic, e.g. `news`, `science`, or `english learning`.
2. Open a podcast feed.
3. Choose an episode marked `CC` when available.
4. Use the Episode Shadow Room:
   - slow playback to `0.8×`
   - listen to one cue
   - press `R` or click `Repeat`
   - speak along on the next pass
   - enable cue loop for difficult phrases

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `←` | Previous transcript cue |
| `→` | Next transcript cue |
| `R` | Repeat active cue |
| `Space` | Play / pause |

## API endpoints used

- `GET /search/byterm`
- `GET /podcasts/byfeedid`
- `GET /episodes/byfeedid`
- `GET /episodes/byid`
- `GET /recent/data`

## Notes

- Transcript availability depends on each podcast feed. Not every episode exposes transcript metadata.
- Speaker labels are best-effort: transcript-embedded labels are used first, then PodcastIndex `persons` metadata is used as fallback context.
- Transcript fetching goes through `/api/transcript?url=...` during development to avoid cross-origin failures.
