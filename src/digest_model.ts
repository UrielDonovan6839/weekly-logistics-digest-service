import { z } from "zod";

const shipmentEventSchema = z.object({
  shipmentId: z.string().min(1),
  kind: z.enum(["picked_up", "in_transit", "delivered", "exception"]),
  occurredAt: z.string().datetime(),
  location: z.string().min(1),
});

const proofOfDeliverySchema = z.object({
  shipmentId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  storageKey: z.string().min(1),
});

const exceptionSchema = z.object({
  shipmentId: z.string().min(1),
  reason: z.string().min(1),
  status: z.enum(["open", "resolved"]),
  openedAt: z.string().datetime(),
});

export const digestRequestSchema = z.object({
  audience: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  weekStart: z.string().datetime(),
  weekEnd: z.string().datetime(),
  shipmentEvents: z.array(shipmentEventSchema),
  proofOfDeliveryFiles: z.array(proofOfDeliverySchema),
  exceptions: z.array(exceptionSchema),
}).refine((body) => new Date(body.weekStart) < new Date(body.weekEnd), {
  message: "weekStart must be before weekEnd",
  path: ["weekEnd"],
});

export type DigestRequest = z.infer<typeof digestRequestSchema>;

export function buildWeeklyDigest(input: DigestRequest) {
  const start = new Date(input.weekStart).getTime();
  const end = new Date(input.weekEnd).getTime();
  const inWindow = (value: string) => {
    const time = new Date(value).getTime();
    return time >= start && time < end;
  };

  const events = input.shipmentEvents.filter((event) => inWindow(event.occurredAt));
  const activeExceptions = input.exceptions.filter(
    (item) => item.status === "open" && inWindow(item.openedAt),
  );
  const delivered = new Set(
    events.filter((event) => event.kind === "delivered").map((event) => event.shipmentId),
  );
  const deliveryProofs = input.proofOfDeliveryFiles.filter((file) => delivered.has(file.shipmentId));

  return {
    recipient: input.audience,
    period: { start: input.weekStart, end: input.weekEnd },
    totals: {
      events: events.length,
      delivered: delivered.size,
      openExceptions: activeExceptions.length,
    },
    activeExceptions,
    deliveryProofs,
    actionRequired: activeExceptions.length > 0,
  };
}
