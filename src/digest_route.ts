import { createServer } from "node:http";
import { ZodError } from "zod";
import { buildWeeklyDigest, digestRequestSchema } from "./digest_model.js";

const port = Number(process.env.PORT ?? 3000);

async function readJson(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");

  if (request.method !== "POST" || request.url !== "/jobs/logistics-digest") {
    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const input = digestRequestSchema.parse(await readJson(request));
    response.writeHead(200).end(JSON.stringify(buildWeeklyDigest(input), null, 2));
  } catch (error) {
    if (error instanceof ZodError) {
      response.writeHead(400).end(JSON.stringify({ error: "Invalid digest request", issues: error.issues }));
      return;
    }
    response.writeHead(400).end(JSON.stringify({ error: "Request body must be valid JSON" }));
  }
});

server.listen(port, () => {
  console.log(`Logistics digest route listening on http://localhost:${port}`);
});
