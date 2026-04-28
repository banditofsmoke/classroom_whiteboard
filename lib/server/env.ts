import { z } from "zod"

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "1"),
})

export type AppEnv = z.infer<typeof EnvSchema>

export function getEnv(): AppEnv {
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n")
    throw new Error(`Invalid environment variables:\n${details}`)
  }
  return parsed.data
}

