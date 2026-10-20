import { z } from "zod";
export const publicationCheckSchema = z.object({
  metadataMatch: z.boolean().optional(),
  identifier: z.string().max(1000),
  checkedAt: z.number().finite(),
  status: z.enum(["retracted", "concern", "corrected", "notice", "no-notice-found", "unknown"]),
  providers: z.array(z.string().max(100)).max(5),
  notices: z
    .array(
      z.object({
        type: z.string().max(500),
        url: z
          .string()
          .url()
          .max(2000)
          .refine((s) => s.startsWith("https://"), "Use an HTTPS notice URL"),
      }),
    )
    .max(50),
  complete: z.boolean(),
});
export type PublicationCheck = z.infer<typeof publicationCheckSchema>;
