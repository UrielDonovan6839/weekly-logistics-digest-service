import { createHash } from "node:crypto";
import { infrai } from "./infrai_cron.js";

const task = process.env.DIGEST_TASK_URL;
if (!task) throw new Error("Set DIGEST_TASK_URL to the public logistics digest route.");

const cron_expr = "0 9 * * 1";
const idempotencyKey = createHash("sha256").update(`weekly-logistics-digest:${cron_expr}:${task}`).digest("hex");
const { job_id } = await infrai.cron.create({ cron_expr, task }, idempotencyKey);

console.log(JSON.stringify({ scheduled: true, job_id, cron_expr, task }, null, 2));
