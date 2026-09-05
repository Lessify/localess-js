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

Use an in-memory TTL cache (`packages/client/src/cache.ts`) keyed by the full request URL (including query params and token). The cache is held in a `Map` and entries expire after the configured TTL.

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

---

## Amendment — 2026-09-05 (F02)

Two decisions above have been superseded. The default behaviour is unchanged; both changes are
additive.

### The cache is now pluggable

> *"Do not add external cache adapters without discussing the zero-dep constraint first."*

Discussed and resolved: `LocalessClientOptions.cache` accepts an `ICache<unknown>`, and `ICache`'s
methods may now return promises so a Redis- or KV-backed cache is expressible. **No adapter ships
with the SDK** — the interface is the deliverable, so the zero-dependency constraint (ADR 002) is
untouched. `cacheTTL` keeps working exactly as before when no cache is supplied; a supplied cache
owns expiry and `cacheTTL` is ignored.

The original reasoning was sound for the built-in cache. What it did not anticipate was that
`ICache` was already exported and documented as public API while being impossible to actually use —
the interface existed but nothing accepted one.

### The cache key no longer contains the token

> *"The cache key is the full URL including the token. This is intentional — different tokens may
> return different results."*

That rationale does not hold for this API. Whether a response is draft or published is determined by
the `version` query param, which **is** part of the key. A token either has permission for that URL
or receives a `403`, and failures are never cached. So for any given key, all tokens that can read
it read the same bytes.

Against that, including the token had two real costs: two clients on one space could not share an
entry, and **any cache that logs or persists its keys persisted a credential** — which a pluggable
cache makes far more likely, since the keys now leave the process.

Keys are now derived from the URL with `token` removed and the remaining params sorted, so key
equality does not depend on the order the URL was built in.

**Consequence to be aware of:** a cache instance shared between two clients is shared *across their
tokens*. Given the reasoning above that is safe for tokens with equal permissions. **Do not share
one cache instance between tokens with different permissions** — a token lacking `CONTENT_DRAFT`
would get a cache hit on a draft entry another client had already stored, rather than the `403` the
API would have given it. The default per-client `TTLCache` is unaffected; this only arises if you
deliberately pass the same cache to two clients.

### Framework caches take precedence

A request carrying `fetchInit.next` or `fetchInit.cache` **bypasses the client cache entirely** —
neither read nor written. Two caching layers over one call is how content survives a
`revalidateTag()`, so when a framework has been asked to cache a request, it owns that request.
