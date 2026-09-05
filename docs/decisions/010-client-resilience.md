# ADR 010 — Client resilience without a dependency

**Status:** Accepted
**Date:** 2026-09-05
**Applies to:** `@localess/client`

## Context

`@localess/client` issued a single bare `fetch` with no retry, no timeout, no cancellation, and no
way to substitute the fetch implementation. A 503 from a cold Cloud Function, a DNS blip, or a
dropped connection during static generation surfaced as a hard build failure.

Every comparable SDK solves this. Storyblok's `@storyblok/api-client` advertises
retry-with-exponential-backoff-and-jitter and preventive rate limiting as headline features — and
implements them on top of `ky`.

## Decision

Build the resilience layer inside `fetchJson`, with **no new dependency**.

Retries, timeouts, and cancellation are **on by default**.

### Why no dependency

ADR 002 and rule 3 in `CLAUDE.md`: `@localess/client` has exactly one `dependencies` entry,
`@localess/model`, and that does not change. `ky`, `p-retry`, and `exponential-backoff` were all
rejected on that basis alone.

The cost is low. Node ≥ 24 and every edge runtime provide `AbortSignal.timeout` and
`AbortSignal.any`, so signal composition is a few lines rather than a vendored implementation. The
whole layer is under 100 lines.

### Why defaults are on

Defaulting to no retries would preserve existing behaviour, which was the safer-looking option. It
was rejected: failing an entire static build on one transient blip is not behaviour worth
preserving, and a consumer who wants it can set `retry: false` and `timeoutMs: false`.

### Why an allowlist of retryable statuses

`[408, 429, 500, 502, 503, 504]` rather than "retry all 5xx". A future non-transient 5xx should not
silently be retried three times, tripling the wait before the consumer sees a real error. A `401`,
`403`, or `404` throws on the first response — a misconfigured token will not fix itself, and
retrying only delays the message that explains it.

Retrying is unconditionally safe here because all four fetching methods are `GET`s. If a mutating
method is ever added to this client, this decision must be revisited — that is the trigger to
re-read this ADR.

### Why full jitter

`delay = random(0, min(maxDelayMs, baseDelayMs × 2^(attempt-1)))`.

Equal jitter still leaves retries clustered. The case being guarded is a batch of static-generation
workers starting against a cold origin at the same instant — precisely the thundering herd that
`localess/docs/cdn-caching.md` describes on the platform side. Full jitter spreads them across the
whole window.

`Retry-After` overrides the computed backoff when the server sends one, clamped to `maxDelayMs` so a
misconfigured server cannot pin a build for an hour.

### Why the timeout is per attempt, not per call

A per-call budget would mean a retry inherits whatever time the previous attempt burned, so the last
attempt often gets almost none — the opposite of useful. Each attempt gets a fresh timeout.

The trade-off is that worst-case latency is roughly `attempts × timeoutMs` plus backoff — about 45
seconds on the defaults against a completely dead origin. That is documented in `docs/client.md`
rather than hidden.

### Why a caller abort is not retried, but a timeout is

They mean different things. A timeout is a transient failure of this attempt; retrying is correct. A
caller abort is a decision — the render was cancelled, the request is no longer wanted — and
retrying it would ignore the caller. The loop distinguishes them by checking whether the caller's
signal is the one that aborted.

## Consequences

- `LocalessApiError` and `LocalessNetworkError` gained an optional `attempts`, and the rendered error
  box shows an `Attempts` row when a request was retried. Additive; the parameter defaults to `1`.
- Every fetching method accepts `signal`, composed with the client's timeout.
- An injectable `fetch` makes instrumentation possible and gives tests a seam that does not require
  patching a global.
- **`@localess/astro` cannot accept `fetch`.** Its client options are serialized with
  `JSON.stringify` into the generated `virtual:localess-init` module, and a function cannot survive
  that. `LocalessOptions` omits the field so passing it is a compile error rather than a silent drop.
  Any future non-serializable client option hits the same wall and needs the same treatment.

## Alternatives rejected

- **Depend on `ky` or `p-retry`.** What Storyblok does. Forbidden by ADR 002.
- **Retry inside each of the four methods.** They all funnel through `fetchJson`; one place is
  correct.
- **A higher default attempt count.** More than three is too slow to fail against a genuinely broken
  origin, and the failure message is what the consumer actually needs.
- **Circuit breaking.** Real value across many requests, but it needs cross-call state and a policy
  for when to re-close. Not justified until someone reports the problem.
- **Rate limiting.** The Localess API publishes no quota, so there is nothing to pace against. See
  `localess/docs/roadmap/F22-rate-limiting.md` for the platform side, which must come first.
