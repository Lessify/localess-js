# ADR 003: In-Memory TTL Cache Design

## Context

Localess API responses are read-heavy and change infrequently. Without caching, each page render triggers a network request to the Localess API, adding latency and load.

Options considered:
- **No cache** — simple but every request is a network round-trip.
- **In-memory TTL cache** — fast, zero dependencies, works within a single process.
- **File system cache** — survives process restarts, enables sharing across workers, but requires filesystem access and adds complexity.
- **Redis / external cache** — the most scalable option but requires infrastructure and a dependency.

The zero-production-dependency constraint (ADR 002) rules out Redis and any cache library. File system cache was considered but removed (see commit history) to keep the implementation simple.

## Decision

Use an in-memory TTL cache (`src/cache.ts`) keyed by the full request URL (including query params and token). The cache is held in a `Map` and entries expire after the configured TTL.

Default TTL: 300 seconds (5 minutes). Configurable via `cacheTTL` option:
- `number` — TTL in seconds
- `false` — disable caching entirely (use `NoCache` which always misses)

## Consequences

**For contributors:**
- The cache key is the full URL including the token. This is intentional — different tokens may return different results.
- Cache is per-client-instance. Two `localessClient()` calls have separate caches.
- Multi-process deployments (e.g. multiple Node.js workers) have independent in-memory caches. This is a known tradeoff — each worker may serve slightly stale data independently of the others.
- `cacheTTL: false` is for draft/preview mode where always-fresh data matters more than performance.
- Do not add external cache adapters without discussing the zero-dep constraint first.
