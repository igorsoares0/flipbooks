import { createScriptClient } from "../prisma/client";
import { sendEmail } from "../src/lib/email/send";
import { processingDoneEmail, processingFailedEmail } from "../src/lib/email/templates";
import { deletePrefix, keys } from "../src/lib/storage/s3";
import { describeFailure } from "./errors";
import { claimNextJob, completeJob, failJob, removeAbandonedUploads, requeueStuckJobs, type ClaimedJob } from "./jobs";
import { renderPdfJob } from "./render-pdf";

// PDF processing worker: polls processing_jobs and renders PDFs to page images.
// Run locally with `npm run worker`; deployed as a container (worker/Dockerfile).

const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY) || 1);
const POLL_MS = Number(process.env.WORKER_POLL_MS) || 1_000;
const JOB_TIMEOUT_MS = Number(process.env.WORKER_JOB_TIMEOUT_MS) || 10 * 60_000;
const APP_URL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const prisma = createScriptClient();

function log(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}

async function notify(flipbookId: string, outcome: { ok: true } | { ok: false; reason: string }) {
  const flipbook = await prisma.flipbook.findUnique({ where: { id: flipbookId }, include: { user: true } });
  if (!flipbook) return;
  const url = `${APP_URL}/dashboard/flipbooks/${flipbookId}/settings`;
  const { email: to, name } = flipbook.user;
  const email = outcome.ok
    ? processingDoneEmail({ to, name, title: flipbook.title, url })
    : processingFailedEmail({ to, name, title: flipbook.title, reason: outcome.reason, url });
  await sendEmail(email).catch((error) => log("email.failed", { flipbookId, error: String(error) }));
}

async function runJob(job: ClaimedJob) {
  const started = Date.now();
  log("job.started", { jobId: job.id, flipbookId: job.flipbookId, attempt: job.attempts });
  const timeout = AbortSignal.timeout(JOB_TIMEOUT_MS);
  try {
    if (job.type !== "RENDER_PDF") throw new Error(`Unknown job type ${job.type}`);
    const { pageCount } = await renderPdfJob(prisma, job.flipbookId, { signal: timeout });
    await completeJob(prisma, job.id);
    log("job.done", { jobId: job.id, flipbookId: job.flipbookId, pageCount, ms: Date.now() - started });
    await notify(job.flipbookId, { ok: true });
  } catch (error) {
    const failure = describeFailure(error);
    const outcome = await failJob(prisma, job, failure);
    log(outcome === "retrying" ? "job.retrying" : "job.failed", {
      jobId: job.id,
      flipbookId: job.flipbookId,
      attempt: job.attempts,
      reason: failure.reason,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - started,
    });
    if (outcome === "failed") await notify(job.flipbookId, { ok: false, reason: failure.reason });
  }
}

let stopping = false;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function slot(n: number) {
  while (!stopping) {
    try {
      const job = await claimNextJob(prisma);
      if (job) await runJob(job);
      else await sleep(POLL_MS);
    } catch (error) {
      log("worker.error", { slot: n, error: String(error) });
      await sleep(POLL_MS * 5);
    }
  }
}

async function sweep() {
  try {
    const requeued = await requeueStuckJobs(prisma);
    const abandoned = await removeAbandonedUploads(prisma, (id) => deletePrefix(keys.prefix(id)));
    if (requeued || abandoned) log("sweep", { requeued, abandoned });
  } catch (error) {
    log("sweep.error", { error: String(error) });
  }
}

async function main() {
  log("worker.started", { concurrency: CONCURRENCY, pollMs: POLL_MS });
  await sweep();
  const sweeper = setInterval(sweep, 60_000);
  const slots = Array.from({ length: CONCURRENCY }, (_, i) => slot(i));

  const stop = (signal: string) => {
    if (stopping) return;
    stopping = true;
    log("worker.stopping", { signal });
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  // Finish the job in hand, then exit.
  await Promise.all(slots);
  clearInterval(sweeper);
  await prisma.$disconnect();
  log("worker.stopped");
}

main().catch((error) => {
  log("worker.crashed", { error: String(error) });
  process.exit(1);
});
