import assert from "node:assert/strict";
import test from "node:test";
import { buildWeeklyDigest, digestRequestSchema } from "../src/digest_model.js";

test("keeps this week's open exception and proof for a delivered shipment", () => {
  const input = digestRequestSchema.parse({
    audience: { name: "West Coast operations", email: "ops@example.com" },
    weekStart: "2026-08-10T00:00:00.000Z",
    weekEnd: "2026-08-17T00:00:00.000Z",
    shipmentEvents: [
      { shipmentId: "SHP-42", kind: "delivered", occurredAt: "2026-08-12T14:00:00.000Z", location: "Oakland" },
      { shipmentId: "SHP-99", kind: "exception", occurredAt: "2026-08-13T08:30:00.000Z", location: "Reno" },
      { shipmentId: "SHP-OLD", kind: "delivered", occurredAt: "2026-08-09T18:00:00.000Z", location: "Fresno" }
    ],
    proofOfDeliveryFiles: [
      { shipmentId: "SHP-42", fileName: "SHP-42-signature.pdf", contentType: "application/pdf", storageKey: "pod/SHP-42.pdf" },
      { shipmentId: "SHP-OLD", fileName: "old.pdf", contentType: "application/pdf", storageKey: "pod/old.pdf" }
    ],
    exceptions: [
      { shipmentId: "SHP-99", reason: "Weather hold", status: "open", openedAt: "2026-08-13T08:30:00.000Z" },
      { shipmentId: "SHP-42", reason: "Address checked", status: "resolved", openedAt: "2026-08-11T10:00:00.000Z" }
    ]
  });

  const digest = buildWeeklyDigest(input);

  assert.deepEqual(digest.totals, { events: 2, delivered: 1, openExceptions: 1 });
  assert.equal(digest.actionRequired, true);
  assert.deepEqual(digest.activeExceptions.map((item) => item.shipmentId), ["SHP-99"]);
  assert.deepEqual(digest.deliveryProofs.map((item) => item.shipmentId), ["SHP-42"]);
});
