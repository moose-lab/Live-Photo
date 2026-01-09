# Live-Photo

Live-Photo is a lightweight creative tool that turns live videos into share-ready moments by generating a doodle-style cover image from the video. It captures the vibe of the motion, adds a playful illustrated layer, and produces a striking cover that makes live content feel more expressive and easier to share across platforms.

## Tech Stack

Built with modern web technologies and deployed on Vercel:

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: Zustand
- **Database**: Vercel Postgres (Neon) + Prisma ORM
- **File Storage**: Vercel Blob Storage
- **Queue System**: Upstash QStash
- **AI Processing**: Replicate.com
- **Monitoring**: Vercel Analytics
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Vercel account
- (Optional) Upstash account for QStash
- (Optional) Replicate account for AI processing

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:
- Database URLs (from Vercel Postgres)
- Blob storage token (from Vercel Blob)
- QStash credentials (from Upstash)
- Replicate API token

3. Run database migrations:
```bash
npx prisma migrate dev
```

4. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
/app
  /api
    /upload       # File upload endpoint
    /generate     # Processing trigger
    /status       # SSE status updates
  /page.tsx       # Main upload interface
/components
  /ui             # shadcn/ui components
  /upload         # Upload-specific components
  /preview        # Preview components
/lib
  /db.ts          # Prisma client
  /store.ts       # Zustand state management
  /types.ts       # TypeScript types
  /utils.ts       # Utility functions
/prisma
  /schema.prisma  # Database schema
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import the project in Vercel:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. Add environment variables in Vercel Dashboard:
   - Go to Settings → Environment Variables
   - Add all variables from `.env.example`

4. Create Vercel Postgres database:
   - Go to Storage → Create Database → Postgres
   - Copy connection strings to environment variables

5. Create Vercel Blob storage:
   - Go to Storage → Create Store → Blob
   - Copy token to environment variables

6. Deploy:
   - Vercel will automatically deploy on every push to main
   - Run migrations after first deployment:
   ```bash
   npx prisma migrate deploy
   ```

## Architecture

See the complete architecture document in `_bmad-output/planning-artifacts/architecture.md` for detailed decisions and implementation guides.

### Key Features

- **Video Upload**: Drag-and-drop or click to upload videos (MP4, MOV, WebM)
- **Real-time Progress**: Server-Sent Events (SSE) for live status updates
- **AI Processing**: Queue-based asynchronous video processing
- **Image Optimization**: Automatic WebP/AVIF conversion and CDN delivery
- **Responsive Design**: Works on desktop and mobile devices
- **Type Safety**: Full TypeScript support with Prisma-generated types

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Create and apply migrations

### Adding UI Components

Add new shadcn/ui components:
```bash
npx shadcn@latest add <component-name>
```

## License

MIT
