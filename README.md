# vibecircle

**See what your team is building.**

A shared feed for teams who vibe code together. The plugin auto-captures what everyone builds — headlines, descriptions, deploy links — so the whole team stays in sync without standups.

![vibecircle feed](docs/screenshot-feed.jpg)

## Features

- **Plugin auto-captures** — a smart sentinel detects share-worthy moments and posts them automatically
- **AI writes the headlines** — plain-English summaries of what was built, generated for every post
- **Narrative arcs** — follow a feature from first commit to ship, as a coherent story in the feed
- **Ambient presence** — see who's building right now
- **Reactions & comments** — async team energy without the meetings

## Quick Start

### Use it

1. **Sign up** at [vibecircle.dev](https://vibecircle.dev)
2. **Create a circle** and invite your team
3. **Install the plugin**: `/plugin marketplace add miltonian/vibecircle` then `/plugin install vibecircle`
4. **Set up auth**: `/circle setup` (the setup page guides you through this)
5. **Start coding** — the plugin handles the rest

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
