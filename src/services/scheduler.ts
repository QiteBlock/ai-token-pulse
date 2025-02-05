import cron from "node-cron";
import { TokenPulse } from "../index";

export class SchedulerService {
  private tokenPulse: TokenPulse;
  private cronJob: cron.ScheduledTask | null = null;
  private runCount: number = 0;
  private lastResetDay: number = new Date().getDate();

  constructor(tokenPulse: TokenPulse) {
    this.tokenPulse = tokenPulse;
  }

  async start() {
    if (
      !process.env.SCHEDULE_ENABLED ||
      process.env.SCHEDULE_ENABLED !== "true"
    ) {
      console.log("Scheduler is disabled via environment variables");
      return;
    }

    const interval = process.env.SCHEDULE_INTERVAL_MINUTES || "60";
    const timezone = process.env.SCHEDULE_TIMEZONE || "UTC";
    const maxDailyRuns = parseInt(process.env.MAX_DAILY_RUNS || "24");
    const startHour = parseInt(process.env.START_HOUR || "0");
    const endHour = parseInt(process.env.END_HOUR || "23");

    // Create cron expression
    const cronExpression = `*/${interval} ${startHour}-${endHour} * * *`;

    if (!cron.validate(cronExpression)) {
      throw new Error("Invalid cron expression");
    }

    // Run immediately on start
    const currentHour = new Date().getHours();
    if (currentHour >= startHour && currentHour <= endHour) {
      console.log("Running initial task...");
      await this.executeScheduledTask(maxDailyRuns);
    }

    // Set up scheduled runs
    this.cronJob = cron.schedule(
      cronExpression,
      async () => {
        await this.executeScheduledTask(maxDailyRuns);
      },
      {
        timezone,
      }
    );

    console.log(
      `Scheduler started: Running every ${interval} minutes between ${startHour}:00 and ${endHour}:00 ${timezone}`
    );
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log("Scheduler stopped");
    }
  }

  private async executeScheduledTask(maxDailyRuns: number) {
    try {
      // Reset counter if it's a new day
      const currentDay = new Date().getDate();
      if (currentDay !== this.lastResetDay) {
        this.runCount = 0;
        this.lastResetDay = currentDay;
      }

      // Check if we've exceeded daily run limit
      if (this.runCount >= maxDailyRuns) {
        console.log(
          `Daily run limit (${maxDailyRuns}) reached. Waiting for next day.`
        );
        return;
      }

      console.log(
        `Starting scheduled run ${
          this.runCount + 1
        }/${maxDailyRuns} for the day`
      );
      await this.tokenPulse.run();
      this.runCount++;
    } catch (error) {
      console.error("Error in scheduled task:", error);
    }
  }
}
