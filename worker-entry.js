// Cloudflare Worker entrypoint wrapping the generated OpenNext worker.
// The wrapper survives OpenNext rebuilds and adds native Cloudflare Cron support.
import openNextWorker, {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };

export default {
  fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },

  async scheduled(_controller, env, ctx) {
    const task = async () => {
      if (!env.REMINDER_CRON_SECRET) {
        throw new Error("REMINDER_CRON_SECRET is not configured");
      }

      // Route the scheduled event through the app internally. This reuses the
      // same reminder selection, Resend delivery, localization and audit logic
      // as the protected manual endpoint without exposing the secret in a URL.
      const request = new Request(
        "https://app.facturio.ch/app/api/cron/reminders",
        {
          method: "GET",
          headers: {
            "x-reminder-secret": env.REMINDER_CRON_SECRET,
            "user-agent": "facturio-cloudflare-cron/1.0",
          },
        },
      );
      const response = await openNextWorker.fetch(request, env, ctx);
      const body = await response.text();

      if (!response.ok) {
        throw new Error(
          `Payment-reminder cron failed (${response.status}): ${body.slice(0, 500)}`,
        );
      }

      console.log(`Payment-reminder cron completed: ${body.slice(0, 1000)}`);
    };

    ctx.waitUntil(task());
  },
};
