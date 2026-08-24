# playground-vue-nuxt (disabled)

This playground's `package.json` is intentionally renamed to `package.json.disabled`
so it isn't picked up by the root `workspaces` glob.

**Why:** `npm install` (npm 10.9.3) crashes with an internal Arborist bug
(`Cannot read properties of null (reading 'edgesOut')`) whenever this
workspace's `nuxt` dependency is present, reproduced with both `nuxt@^4.0.0`
and `nuxt@^3.15.0` — Nuxt's large/nested peer-dependency graph triggers a
known class of npm resolver bugs. `--legacy-peer-deps` works around the
crash but disables npm's automatic peer-dependency installation repo-wide,
which broke `@tiptap/pm` resolution for `@localess/vue` — too risky to apply
just to unblock this one playground.

**To re-enable:** rename `package.json.disabled` back to `package.json`,
then retry `npm install` from the repo root — ideally after upgrading npm
(`npm install -g npm@latest`) first, since this is an npm-version-specific
bug, not a `@localess/vue`/Nuxt integration problem. All the source files
here (`nuxt.config.ts`, `server/api/content.ts`, `app/`) are already
complete per `docs/superpowers/plans/2026-08-24-vue-integration.md`'s Task 10
— only the install step is blocked.
