# Contributing to vibecircle

Thanks for wanting to contribute! This is an open source project for vibe coders, and we keep things chill.

## Getting started

```bash
# Clone the repo
git clone https://github.com/miltonian/vibecircle.git
cd vibecircle

# Install dependencies
bun install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Fill in your values — see .env.example for details

# Push the database schema to your Neon Postgres instance
bun run db:push

# (Optional) Seed demo data
bun run seed

# Start the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project structure

```
vibecircle/
├── apps/
│   └── web/               # Next.js 16 web app
│       ├── src/
│       │   ├── app/        # App router pages & API routes
│       │   ├── components/ # React components
│       │   └── lib/        # Shared utilities, DB schema, auth
│       ├── drizzle/        # Database migrations
│       └── scripts/        # Seed script, utilities
├── packages/
│   └── plugin/             # Claude Code plugin
│       ├── commands/       # Slash commands (/share, /circle)
│       ├── hooks/          # Lifecycle hooks (post-deploy, etc.)
│       └── scripts/        # Screenshot capture, presence, auth
├── docs/
│   └── specs/              # Design spec & architecture docs
└── turbo.json              # Turborepo config
```

## Development workflow

**Web app** — `bun run dev` starts the Next.js dev server on port 3000.

**Database** — We use Drizzle ORM with Neon Postgres. After changing the schema in `apps/web/src/lib/db/schema.ts`:

```bash
bun run db:generate   # Generate migration
bun run db:push       # Push schema to database
```

**Tests** — `bun run test` runs Vitest tests.

## Plugin development

The Claude Code plugin lives in `packages/plugin/`. To test it locally:

1. Install the plugin from your local repo:
   ```bash
   claude plugin install /path/to/vibecircle/packages/plugin
   ```

2. Make changes to commands or scripts, then reload:
   ```bash
   /plugin reload vibecircle
   ```

3. Test with `/share` and `/circle` commands.

See `packages/plugin/README.md` for more details.

## Submitting changes

1. **Fork** the repo and create a branch (`git checkout -b my-feature`)
2. **Make your changes** — keep commits focused and descriptive
3. **Test** — make sure `bun run build` and `bun run test` pass
4. **Open a PR** — describe what you changed and why

We review PRs quickly. Don't worry about making it perfect — we'd rather see your idea and iterate together.

## Need help?

Open an issue or start a discussion. We're friendly.
