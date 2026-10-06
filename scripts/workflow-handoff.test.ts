import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { z } from "zod";
import {
  handoffSchema,
  validateHandoffs,
  validateWorkflowDirectory,
  type Handoff,
} from "./workflow-handoff";

const runId = "rv-123-import-recipes";
const specContent = "# Spec\n\nRevision: 1\n";
const planContent = "# Plan\n\nRevision: 1\n";
const sha256 = (content: string) => createHash("sha256").update(content).digest("hex");

function handoff(
  sequence: number,
  from: Handoff["from"],
  to: Handoff["to"],
  overrides: Partial<Handoff> = {},
): Handoff {
  return {
    schemaVersion: 1,
    runId,
    sequence,
    from,
    to,
    outcome: "pass",
    artifacts: [],
    evidence: [],
    findings: [],
    attempt: 1,
    ...overrides,
  };
}

const intake = handoff(1, "intake", "plan", {
  artifacts: ["spec.md"],
  approval: {
    artifact: "spec.md",
    revision: 1,
    decision: "approved",
    source: "human-chat",
    statement: "Spec approved",
    sha256: sha256(specContent),
  },
});
const plan = handoff(2, "plan", "verify-plan", {
  artifacts: ["plan.md"],
  approval: {
    artifact: "plan.md",
    revision: 1,
    decision: "approved",
    source: "human-chat",
    statement: "Plan approved",
    sha256: sha256(planContent),
  },
});

test("accepts an approved intake and plan followed by independent plan verification", () => {
  assert.deepEqual(
    validateHandoffs([intake, plan, handoff(3, "verify-plan", "implementation")], runId),
    [],
  );
});

test("rejects missing approvals, skipped stages, and wrong outcome", () => {
  const errors = validateHandoffs(
    [handoff(1, "intake", "plan"), handoff(2, "review", "verify-fix", { outcome: "pass" })],
    runId,
  );
  assert.ok(errors.some((error) => error.includes("needs its human approval record")));
  assert.ok(errors.some((error) => error.includes("expected from plan")));
  assert.ok(errors.some((error) => error.includes("outcome must be return")));
  assert.ok(errors.some((error) => error.includes("a return needs a finding")));
});

test("caps repeated Review returns at three", () => {
  const events: Handoff[] = [
    intake,
    plan,
    handoff(3, "verify-plan", "implementation"),
    handoff(4, "implementation", "verify-fix"),
    handoff(5, "verify-fix", "review"),
  ];
  for (let index = 0; index < 4; index += 1) {
    events.push(
      handoff(events.length + 1, "review", "verify-fix", {
        outcome: "return",
        findings: ["Fix requested"],
      }),
    );
    events.push(handoff(events.length + 1, "verify-fix", "review"));
  }
  assert.ok(
    validateHandoffs(events, runId).some((error) => error.includes("exceeded three returns")),
  );
});

test("tracks Verify/Fix attempts across retry handoffs", () => {
  const events: Handoff[] = [
    intake,
    plan,
    handoff(3, "verify-plan", "implementation"),
    handoff(4, "implementation", "verify-fix"),
    handoff(5, "verify-fix", "verify-fix", { outcome: "retry", findings: ["Check failed"] }),
    handoff(6, "verify-fix", "verify-fix", {
      outcome: "retry",
      findings: ["Check failed again"],
      attempt: 2,
    }),
    handoff(7, "verify-fix", "review", { attempt: 3 }),
  ];
  assert.deepEqual(validateHandoffs(events, runId), []);
  events[6] = handoff(7, "verify-fix", "verify-fix", {
    outcome: "retry",
    findings: ["Still failing"],
    attempt: 3,
  });
  assert.ok(
    validateHandoffs(events, runId).some((error) => error.includes("exceeded three attempts")),
  );
});

test("checks artifact revision in a run directory", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "recipe-workflow-"));
  const runDir = path.join(root, runId);
  try {
    await mkdir(path.join(runDir, "handoffs"), { recursive: true });
    await writeFile(path.join(runDir, "spec.md"), specContent);
    await writeFile(path.join(runDir, "plan.md"), planContent);
    await writeFile(
      path.join(runDir, "handoffs", "0001-intake-to-plan.json"),
      JSON.stringify(intake),
    );
    await writeFile(
      path.join(runDir, "handoffs", "0002-plan-to-verify-plan.json"),
      JSON.stringify(plan),
    );
    assert.deepEqual(await validateWorkflowDirectory(runDir), []);
    await writeFile(path.join(runDir, "plan.md"), "# Changed plan\n\nRevision: 1\n");
    assert.ok(
      (await validateWorkflowDirectory(runDir)).some((error) =>
        error.includes("content does not match"),
      ),
    );
    await writeFile(path.join(runDir, "plan.md"), planContent);
    await writeFile(
      path.join(runDir, "handoffs", "0003-wrong-name.json"),
      JSON.stringify(handoff(3, "verify-plan", "implementation", { artifacts: ["missing.md"] })),
    );
    const artifactErrors = await validateWorkflowDirectory(runDir);
    assert.ok(artifactErrors.some((error) => error.includes("expected filename")));
    assert.ok(artifactErrors.some((error) => error.includes("referenced artifact is missing")));
    await writeFile(path.join(runDir, "plan.md"), "# Plan\n\nRevision: 2\n");
    assert.ok(
      (await validateWorkflowDirectory(runDir)).some((error) =>
        error.includes("revision does not match"),
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects artifact paths outside the run folder", () => {
  const errors = validateHandoffs(
    [intake, handoff(2, "plan", "verify-plan", { artifacts: ["../secret.txt"] })],
    runId,
  );
  assert.ok(errors.some((error) => error.includes("Invalid string")));
});

test("published JSON schema matches the handoff parser", async () => {
  const file = await readFile(
    path.join(process.cwd(), "docs/workflows/handoff.schema.json"),
    "utf8",
  );
  assert.deepEqual(JSON.parse(file), z.toJSONSchema(handoffSchema));
});
