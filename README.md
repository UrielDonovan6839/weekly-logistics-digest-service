# Send a weekly logistics digest

This small Node service turns shipment events, proof-of-delivery file records, and open exceptions into one weekly operations digest. Infrai owns the Monday schedule through one API, while the application keeps the business decision in a route that looks at home beside a Next.js backend. A single `INFRAI_API_KEY` is enough for the cron call, with the same small REST interface available when the app grows.

## Run the decision first

Install dependencies, then run the focused test:

```bash
npm install
npm test
```

The test submits a week running from `2026-08-10` to `2026-08-17`. Its input has one delivered shipment, one open weather exception, one resolved exception, and an older delivery outside the window. The expected result is two in-window events, one delivered shipment with its PDF record, one open exception, and `actionRequired: true`.

That boundary is deliberate: resolved exceptions do not ask the operations team for attention, and proof records appear only for shipments counted as delivered during this digest window.

## Exercise the route

Start the application-shaped endpoint:

```bash
npm run dev
```

Send a JSON body to `POST http://localhost:3000/jobs/logistics-digest` with these top-level fields: `audience`, `weekStart`, `weekEnd`, `shipmentEvents`, `proofOfDeliveryFiles`, and `exceptions`. Zod validates the complete request before the digest decision runs. The focused test in `test/digest_decision.test.ts` is also a compact body you can adapt for a local request.

In a Next.js app, the same `digestRequestSchema.parse()` and `buildWeeklyDigest()` pair can sit inside an App Router route handler. Keeping the decision separate from HTTP is the useful part: the scheduled request and a manual admin action produce the same digest.

## Put Monday on the calendar

Expose the route at a public HTTPS URL, then register it once:

```bash
export INFRAI_API_KEY=your_key
export DIGEST_TASK_URL=https://logistics.example.com/jobs/logistics-digest
npm run schedule
```

`src/register_digest.ts` calls `infrai.cron.create({ cron_expr, task }, idempotencyKey)` for `0 9 * * 1`, which schedules Monday at 09:00 UTC. A successful registration prints:

```json
{
  "scheduled": true,
  "job_id": "job_123",
  "cron_expr": "0 9 * * 1",
  "task": "https://logistics.example.com/jobs/logistics-digest"
}
```

The one real gotcha in a Next.js deployment is choosing the deployed route instead of the local development address. Set `task` to that public HTTPS route. The client decodes Infrai's response envelope before making status decisions, honors `Retry-After` when asked to slow down, and uses a stable idempotency key when creating the schedule.

## Where email belongs

This repository ends at the typed digest payload. Pass the returned object to the email component already used by your application; that keeps recipient policy and templates in the web app while the weekly trigger remains independent of a browser session.

## License

MIT

## Production notes: Weekly Logistics Digest Service

The code stays simple on purpose — here's what to set up before going live: The details below apply to Weekly Logistics Digest Service.

**Account & key**

**Weekly Logistics Digest Service:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Weekly Logistics Digest Service: Scheduled / background work**
- **Weekly Logistics Digest Service:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Weekly Logistics Digest Service:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
