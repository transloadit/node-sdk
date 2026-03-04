# @transloadit/notify-url-relay

Local `notify_url` relay for Transloadit Assemblies. This tool polls the status of Assemblies until they complete, then pushes the status to a pingback URL of your choosing. This is useful while on a development machine, which is inaccessible from the public internet and hence can't be notified by Transloadit. 

You can alternatively use a tunnel like ngrok or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/) for this, this is just one more way.

This version is modernized for:

- Node.js 24+
- Native TypeScript execution (type stripping)
- ESM
- Yarn 4
- Biome + Vitest + GitHub Actions + Changesets

Notify payloads are signed via `@transloadit/utils` using prefixed `sha384` signatures.
Forwarding uses native `fetch`, polling retries use `p-retry`, and logs are emitted via `@transloadit/sev-logger`.
Metrics hooks are available for counters, gauges, and timings.

## Install

```bash
npm install @transloadit/notify-url-relay
```

## CLI usage

```bash
export TRANSLOADIT_SECRET="your-secret"

notify-url-relay \
  --notifyUrl "http://127.0.0.1:3000/transloadit" \
  --port 8888 \
  --notifyOnTerminalError \
  --log-level info
```

Run `notify-url-relay --help` for all options.

Log level accepts `0-8` or names:
`emerg`, `alert`, `crit`, `err`, `warn`, `notice`, `info`, `debug`, `trace`.
You can also set `TRANSLOADIT_LOG_LEVEL`.

### Reactive TUI Mode

```bash
notify-url-relay --ui --log-level info
```

This opens a live terminal dashboard with:

- throughput and retry counters
- in-flight queue gauges
- latency sparklines
- streaming logs

## Programmatic usage

```ts
import { TransloaditNotifyUrlProxy } from '@transloadit/notify-url-relay'

const proxy = new TransloaditNotifyUrlProxy(
  process.env.TRANSLOADIT_SECRET ?? '',
  'http://127.0.0.1:3000/transloadit'
)

proxy.run({
  port: 8888,
  target: 'https://api2.transloadit.com',
  forwardTimeoutMs: 15000,
  pollIntervalMs: 2000,
  pollMaxIntervalMs: 30000,
  pollBackoffFactor: 2,
  pollRequestTimeoutMs: 15000,
  maxPollAttempts: 10,
  maxInFlightPolls: 4,
  notifyOnTerminalError: false,
  notifyTimeoutMs: 15000,
  notifyMaxAttempts: 3,
  notifyIntervalMs: 500,
  notifyMaxIntervalMs: 5000,
  notifyBackoffFactor: 2
})
```

## Development

```bash
corepack yarn
corepack yarn workspace @transloadit/notify-url-relay check
corepack yarn workspace @transloadit/notify-url-relay test:real
```

## Real API E2E

Run an opt-in test against the real Transloadit API (default `yarn test` excludes this test):

```bash
# set locally (for example in .env)
export TRANSLOADIT_KEY="your-key"
export TRANSLOADIT_SECRET="your-secret"
# optional
export TRANSLOADIT_ENDPOINT="https://api2.transloadit.com"

corepack yarn workspace @transloadit/notify-url-relay test:real
```

For CI, configure repository secrets:

- `TRANSLOADIT_KEY`
- `TRANSLOADIT_SECRET`
- `TRANSLOADIT_ENDPOINT` (optional)

## Releases

Changesets drives releases for this package:

```bash
corepack yarn changeset
corepack yarn changeset:version
```

On pushes to `main`, `.github/workflows/release.yml` runs `changesets/action` to publish.
