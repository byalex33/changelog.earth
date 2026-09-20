declare namespace Cloudflare {
  interface Env {
    GROQ_API_KEY?: string;
    GROQ_MODEL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
