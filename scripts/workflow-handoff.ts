import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const stageSchema = z.enum([
  "intake",
  "plan",
  "implementation",
  "verify-fix",
  "review",
  "open-pr",
  "human-review",
  "complete",
]);

const approvalSchema = z.strictObject({
  artifact: z.enum(["spec.md", "plan.md"]),
  revision: z.number().int().positive(),
  decision: z.literal("approved"),
  source: z.literal("human-chat"),
  statement: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const artifactPathSchema = z
  .string()
  .regex(/^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9][A-Za-z0-9._/-]*$/);

export const handoffSchema = z.strictObject({
  schemaVersion: z.literal(1),
  runId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sequence: z.number().int().positive(),
  from: stageSchema,
  to: stageSchema,
  outcome: z.enum(["pass", "return", "retry", "blocked", "complete"]),
  artifacts: z.array(artifactPathSchema),
  evidence: z.array(z.string().min(1)),
  findings: z.array(z.string().min(1)),
  attempt: z.number().int().min(1).max(3),
  approval: approvalSchema.optional(),
});

export type Handoff = z.infer<typeof handoffSchema>;
type Stage = z.infer<typeof stageSchema>;

const allowedTransitions: Record<Stage, readonly Stage[]> = {
  intake: ["plan"],
  plan: ["implementation"],
  implementation: ["verify-fix", "plan", "intake"],
  "verify-fix": ["review", "plan", "intake"],
  review: ["open-pr", "verify-fix", "plan", "intake"],
  "open-pr": ["human-review", "verify-fix"],
  "human-review": ["verify-fix", "intake", "complete"],
  complete: [],
};

const returnTransitions = new Set([
  "implementation:plan",
  "implementation:intake",
  "verify-fix:plan",
  "verify-fix:intake",
  "review:verify-fix",
  "review:plan",
  "review:intake",
  "open-pr:verify-fix",
  "human-review:verify-fix",
  "human-review:intake",
]);

export function validateHandoffs(handoffs: readonly unknown[], runId: string): string[] {
  const errors: string[] = [];
  let current: Stage = "intake";
  let reviewReturns = 0;
  let verifyFixAttempt = 1;
  const approvedRevision = { "spec.md": 0, "plan.md": 0 };

  handoffs.forEach((value, index) => {
    const parsed = handoffSchema.safeParse(value);
    if (!parsed.success) {
      errors.push(
        `Handoff ${index + 1}: ${parsed.error.issues.map((issue) => issue.message).join(", ")}`,
      );
      return;
    }

    const handoff = parsed.data;
    if (handoff.runId !== runId)
      errors.push(`Handoff ${index + 1}: runId does not match directory`);
    if (handoff.sequence !== index + 1)
      errors.push(`Handoff ${index + 1}: sequence must be ${index + 1}`);
    if (handoff.from !== current) errors.push(`Handoff ${index + 1}: expected from ${current}`);
    if (handoff.from === "verify-fix") {
      if (handoff.attempt !== verifyFixAttempt)
        errors.push(`Handoff ${index + 1}: Verify/Fix attempt must be ${verifyFixAttempt}`);
    } else if (handoff.attempt !== 1) {
      errors.push(`Handoff ${index + 1}: attempt must be 1 outside Verify/Fix`);
    }

    if (handoff.outcome === "retry") {
      if (handoff.from !== "verify-fix" || handoff.to !== "verify-fix")
        errors.push(`Handoff ${index + 1}: retry must stay in Verify/Fix`);
      if (handoff.findings.length === 0) errors.push(`Handoff ${index + 1}: retry needs a finding`);
      if (verifyFixAttempt >= 3)
        errors.push(`Handoff ${index + 1}: Verify/Fix exceeded three attempts`);
      verifyFixAttempt += 1;
      return;
    }

    if (handoff.outcome === "blocked") {
      if (handoff.to !== handoff.from)
        errors.push(`Handoff ${index + 1}: blocked handoff must stay in its stage`);
      if (handoff.findings.length === 0)
        errors.push(`Handoff ${index + 1}: blocked handoff needs a finding`);
      return;
    }

    if (!allowedTransitions[handoff.from].includes(handoff.to)) {
      errors.push(`Handoff ${index + 1}: ${handoff.from} cannot advance to ${handoff.to}`);
    }
    const expectedOutcome =
      handoff.to === "complete"
        ? "complete"
        : returnTransitions.has(`${handoff.from}:${handoff.to}`)
          ? "return"
          : "pass";
    if (handoff.outcome !== expectedOutcome) {
      errors.push(`Handoff ${index + 1}: outcome must be ${expectedOutcome}`);
    }
    if (expectedOutcome === "return" && handoff.findings.length === 0) {
      errors.push(`Handoff ${index + 1}: a return needs a finding`);
    }

    const approvalArtifact =
      handoff.from === "intake" && handoff.to === "plan"
        ? "spec.md"
        : handoff.from === "plan" && handoff.to === "implementation"
          ? "plan.md"
          : undefined;
    if (
      approvalArtifact &&
      (handoff.approval?.artifact !== approvalArtifact ||
        !handoff.artifacts.includes(approvalArtifact))
    ) {
      errors.push(`Handoff ${index + 1}: ${approvalArtifact} needs its human approval record`);
    }
    if (
      approvalArtifact &&
      handoff.approval &&
      handoff.approval.revision <= approvedRevision[approvalArtifact]
    ) {
      errors.push(`Handoff ${index + 1}: ${approvalArtifact} revision must increase`);
    }
    if (approvalArtifact && handoff.approval)
      approvedRevision[approvalArtifact] = handoff.approval.revision;
    if (
      handoff.from === "plan" &&
      handoff.to === "implementation" &&
      approvedRevision["spec.md"] === 0
    ) {
      errors.push(`Handoff ${index + 1}: spec.md must be approved before implementation`);
    }
    if (!approvalArtifact && handoff.approval)
      errors.push(`Handoff ${index + 1}: approval is only valid at a human gate`);

    if (handoff.from === "review" && handoff.to === "verify-fix") {
      reviewReturns += 1;
      if (reviewReturns > 3) errors.push(`Handoff ${index + 1}: Review has exceeded three returns`);
    }
    if (handoff.to === "complete" && handoff.evidence.length === 0)
      errors.push(`Handoff ${index + 1}: completion needs PR evidence`);
    if (
      handoff.from === "open-pr" &&
      handoff.to === "human-review" &&
      handoff.evidence.length === 0
    )
      errors.push(`Handoff ${index + 1}: Open PR needs a PR link in evidence`);
    if (handoff.to === "verify-fix") verifyFixAttempt = 1;
    current = handoff.to;
  });

  return errors;
}

export async function validateWorkflowDirectory(
  runDir: string,
  workflowsRoot = path.resolve("workflows"),
): Promise<string[]> {
  const realWorkflowsRoot = await realpath(workflowsRoot);
  const realRunDir = await realpath(runDir);
  if (path.dirname(realRunDir) !== realWorkflowsRoot) {
    throw new Error("Workflow run directory must be a direct child of workflows/.");
  }
  const runId = path.basename(realRunDir);
  runDir = realRunDir;
  const handoffDir = path.join(runDir, "handoffs");
  const files = (await readdir(handoffDir)).filter((file) => file.endsWith(".json")).sort();
  const errors: string[] = [];
  const handoffs: unknown[] = [];

  for (const [index, file] of files.entries()) {
    const expectedPrefix = String(index + 1).padStart(4, "0") + "-";
    if (!file.startsWith(expectedPrefix)) errors.push(`${file}: expected prefix ${expectedPrefix}`);
    try {
      const handoff: unknown = JSON.parse(await readFile(path.join(handoffDir, file), "utf8"));
      handoffs.push(handoff);
      const parsed = handoffSchema.safeParse(handoff);
      if (parsed.success) {
        const expectedFile = `${expectedPrefix}${parsed.data.from}-to-${parsed.data.to}.json`;
        if (file !== expectedFile) errors.push(`${file}: expected filename ${expectedFile}`);
      }
    } catch {
      errors.push(`${file}: invalid JSON`);
      handoffs.push(null);
    }
  }

  if (files.length === 0) errors.push("No handoffs found");
  const handoffErrors = validateHandoffs(handoffs, runId);
  const artifactPaths = new Set(
    handoffs.flatMap((handoff) => {
      const parsed = handoffSchema.safeParse(handoff);
      return parsed.success ? parsed.data.artifacts : [];
    }),
  );
  for (const artifact of artifactPaths) {
    try {
      const artifactFile = path.join(runDir, artifact);
      const realArtifact = await realpath(artifactFile);
      if (!realArtifact.startsWith(realRunDir + path.sep))
        errors.push(`${artifact}: artifact resolves outside run directory`);
      if (!(await stat(artifactFile)).isFile()) errors.push(`${artifact}: artifact is not a file`);
    } catch {
      errors.push(`${artifact}: referenced artifact is missing`);
    }
  }
  for (const artifact of ["spec.md", "plan.md"] as const) {
    const approvals = handoffs
      .map((handoff) => handoffSchema.safeParse(handoff))
      .filter((parsed) => parsed.success && parsed.data.approval?.artifact === artifact);
    const latest = approvals.at(-1);
    if (!latest?.success) continue;
    try {
      const content = await readFile(path.join(runDir, artifact), "utf8");
      const revision = content.match(/^Revision: (\d+)$/m)?.[1];
      if (Number(revision) !== latest.data.approval?.revision)
        errors.push(`${artifact}: revision does not match latest approval`);
      const digest = createHash("sha256").update(content).digest("hex");
      if (digest !== latest.data.approval?.sha256)
        errors.push(`${artifact}: content does not match latest approval`);
    } catch {
      errors.push(`${artifact}: approved artifact is missing`);
    }
  }
  return [...errors, ...handoffErrors];
}
