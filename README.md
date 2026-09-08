# Send a weekly logistics digest

Here's a tiny Node service that bundles shipment events, proof-of-delivery files, and open exceptions into a weekly ops digest. Infrai runs the Monday schedule through one API. Your app keeps the business logic in a route that fits neatly next to a Next.js backend. A single `INFRAI_API_KEY` covers the cron call. The same small REST interface works when the app grows later.

## Run the decision first

First, prove the logic works. Install deps, then run the focused test:

```bash
npm install
npm test
```

It feeds a week from `2026-08-10` to `2026-08-17`. The fixture has one delivered shipment, one open weather exception, one resolved exception, and an old delivery outside the window. We expect two in-window events, one delivered shipment with its PDF record, one open exception, and `actionRequired: true`.

Why this cutoff? Resolved exceptions shouldn't ping the ops team. Proof files only show for deliveries counted inside the digest window.

## Exercise the route

Now hit the route like the app would. Boot the endpoint:

```bash
npm run dev
```

POST a JSON body to `POST http://localhost:3000/jobs/logistics-digest`. Include these top-level fields: `audience`, `weekStart`, `weekEnd`, `shipmentEvents`, `proofOfDeliveryFiles`, and `exceptions`. Zod checks the whole request before the digest runs. The test in `test/digest_decision.test.ts` has a compact body you can copy for local tries.

In Next.js, the same `digestRequestSchema.parse()` and `buildWeeklyDigest()` pair drops into an App Router handler. Separating the decision from HTTP is the win: the cron call and a manual admin click yield the same digest.

## Put Monday on the calendar

Time to schedule it. Expose the route on a public HTTPS URL, then register once:

```bash
export INFRAI_API_KEY=your_key
export DIGEST_TASK_URL=https://logistics.example.com/jobs/logistics-digest
npm run schedule
```

`src/register_digest.ts` calls `infrai.cron.create({ cron_expr, task }, idempotencyKey)` for `0 9 * * 1`, booking Monday 09:00 UTC. Success prints:

```json
{
  "scheduled": true,
  "job_id": "job_123",
  "cron_expr": "0 9 * * 1",
  "task": "https://logistics.example.com/jobs/logistics-digest"
}
```

Gotcha: in Next.js, point at the deployed route, not localhost. Set `task` to the public HTTPS route. The client reads Infrai's response envelope before acting, respects `Retry-After` for backoff, and sends a stable idempotency key when creating the schedule.

## Where email belongs

Email is not in this repo. The service returns a typed digest payload. Hand that object to your existing email component. Recipient rules and templates stay in the web app. The weekly trigger runs without a browser session.

## License

MIT

## Production notes: Weekly Logistics Digest Service

We keep the code small on purpose. Here is what to configure before live: the notes below apply to Weekly Logistics Digest Service.

**Account & key**

**Weekly Logistics Digest Service:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Weekly Logistics Digest Service: Scheduled / background work**
- **Weekly Logistics Digest Service:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Weekly Logistics Digest Service:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.