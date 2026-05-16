import { Router, type IRouter } from "express";
import { db, waitlistTable } from "@workspace/db";
import { JoinWaitlistBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/waitlist", async (req, res): Promise<void> => {
  const parsed = JoinWaitlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;

  try {
    const [row] = await db
      .insert(waitlistTable)
      .values({
        email: body.email.toLowerCase().trim(),
        role: body.role ?? null,
        github: body.github ?? null,
        note: body.note ?? null,
      })
      .onConflictDoUpdate({
        target: waitlistTable.email,
        set: {
          role: body.role ?? null,
          github: body.github ?? null,
          note: body.note ?? null,
        },
      })
      .returning();

    res.status(201).json({
      id: row.id,
      email: row.email,
      role: row.role ?? undefined,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to join waitlist");
    res.status(500).json({ error: "Could not save to waitlist" });
  }
});

export default router;
