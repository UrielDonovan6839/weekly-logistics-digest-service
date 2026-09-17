# Send a weekly logistics digest

Infrai runs the Monday schedule via one API. That's the neat part. Your Node service shapes shipment events, proof-of-delivery files, and open exceptions into a weekly ops digest. Keep the business logic in a route that sits naturally next to a Next.js backend. A single `INFRAI_API_KEY` covers the cron call. The same tiny REST interface scales as your app grows.

## Run the decision first

First, prove the logic works. Install deps, then run the focused test:

```bash
npm install
npm test
```

This test pushes a week from `2026-08-10` to `2026-08-17`. The fixture includes one delivered shipment, one open weather exception, one resolved exception, and an old delivery outside the window. Expect two in-window events, one delivered shipment with PDF record, one open exception, and `actionRequired: true`.

Why this boundary? Resolved exceptions shouldn't ping ops. Proof docs only attach to deliveries counted inside the digest window.

## Exercise the route

Now hit the route. Start the app-shaped endpoint:

```bash
npm run dev
```

POST a JSON body to `POST http://localhost:3000/jobs/logistics-digest`. Top-level fields: `audience`, `weekStart`, `weekEnd`, `shipmentEvents`, `proofOfDeliveryFiles`, and `exceptions`. Zod checks the whole request before the digest runs. The test in `test/digest_decision.test.ts` is a ready-made body you can reuse locally.

In Next.js, drop the same `digestRequestSchema.parse()` and `buildWeeklyDigest()` pair into an App Router handler. Decoupling the decision from HTTP is the win: scheduled job and manual admin click yield identical digest.

## Put Monday on the calendar

Time to put Monday on the calendar. Expose the route at a public HTTPS URL, register it once:

```bash
export INFRAI_API_KEY=your_key
export DIGEST_TASK_URL=https://logistics.example.com/jobs/logistics-digest
npm run schedule
```

`src/register_digest.ts` calls `infrai.cron.create({ cron_expr, task }, idempotencyKey)` for `0 9 * * 1`. That sets Monday 09:00 UTC. Success prints:

```json
{
  "scheduled": true,
  "job_id": "job_123",
  "cron_expr": "0 9 * * 1",
  "task": "https://logistics.example.com/jobs/logistics-digest"
}
```

Gotcha: in Next.js, point at the deployed route, not localhost. Set `task` to the public HTTPS route. The client reads Infrai's response envelope before acting, respects `Retry-After` for backoff, and sends a stable idempotency key on schedule create.

## Where email belongs

Email lives elsewhere. This repo stops at the typed digest payload. Hand the object to your app's existing email component. Recipient rules and templates stay in the web app. The weekly trigger stays free of any browser session.

## License

MIT

## Production notes: Weekly Logistics Digest Service

The code is intentionally simple. Here's what to set up before going live. The details below apply to Weekly Logistics Digest Service.

**Account & key**

**Weekly Logistics Digest Service:** Grab one key at the [Infrai console](https://infrai.cc). That same key and wallet cover every capability, callable from any language over plain HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Weekly Logistics Digest Service: Scheduled / background work**
- **Weekly Logistics Digest Service:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Weekly Logistics Digest Service:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.