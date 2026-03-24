# vibecircle

**See what your friends are building.**

A social feed for friend groups who vibe code. Share what you're building, play with each other's apps, and feel the energy of friends creating together.

![vibecircle feed](docs/screenshot-feed.jpg)

## Features

- **Auto-capture** — Claude Code plugin shares screenshots and deploy links as you build
- **Play with live apps** — interactive embeds of friends' projects right in the feed
- **AI explains how it's built** — understand any project with one click (BYOK)
- **Ambient presence** — see who's building right now
- **Reactions & comments** — friend-group energy

## Quick Start

### Use it

1. **Sign up** at [vibecircle.dev](https://vibecircle.dev)
2. **Create a circle** and invite your friends
3. **Install the plugin**: `/plugin marketplace add miltonian/vibecircle` then `/plugin install vibecircle`
4. **Set up auth**: `/circle setup`
5. **Share**: `/share` while coding

### Run it yourself

See [CONTRIBUTING.md](CONTRIBUTING.md) for full setup instructions.

```bash
git clone https://github.com/miltonian/vibecircle.git
cd vibecircle
bun install
cp apps/web/.env.example apps/web/.env.local
# fill in env vars
bun run db:push
bun run seed
bun run dev
```

## Tech Stack

Next.js 16 · Tailwind CSS · shadcn/ui · Drizzle ORM · Neon Postgres · Auth.js · Vercel Blob · AI SDK · Bun · Turborepo

## Architecture

See [docs/specs/design.md](docs/specs/design.md) for the full design spec — data model, plugin architecture, auth flows, and more.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome.

Open source under [MIT License](LICENSE).

---

Built with [Claude Code](https://claude.ai/code).
