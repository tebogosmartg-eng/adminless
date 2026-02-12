"use client";

/**
 * Utility to track and throttle remote Supabase requests
 * to prevent infinite loops and over-fetching.
 */
class SupabaseMonitor {
  private requestCount = 0;
  private lastRequestTime = 0;
  private recentRequests: { path: string; time: number }[] = [];

  logRequest(path: string) {
    this.requestCount++;
    const now = Date.now();
    
    // Track requests in the last 2 seconds to detect loops
    this.recentRequests = this.recentRequests.filter(r => now - r.time < 2000);
    this.recentRequests.push({ path, time: now });

    if (this.recentRequests.length > 15) {
      console.warn(`%c[Performance Warning] High frequency of Supabase requests detected: ${path}`, "color: orange; font-weight: bold;");
    }

    if (this.requestCount % 10 === 0) {
      console.log(`%c[Supabase Monitor] Total remote requests this session: ${this.requestCount}`, "color: #3b82f6;");
    }
  }

  getCount() {
    return this.requestCount;
  }
}

export const monitor = new SupabaseMonitor();