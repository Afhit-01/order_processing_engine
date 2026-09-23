import rateLimit from "express-rate-limit";

const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10);
const apiMax = Number(process.env.API_RATE_LIMIT_MAX ?? 80);

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authMax,
  message: {
    error:
      "Too many authentication attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: apiMax,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// TO-DO: switch to rate-limit-redis
