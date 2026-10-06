import { validateWorkflowDirectory } from "./workflow-handoff";

const runDir = process.argv[2];
if (!runDir) {
  console.error("Usage: pnpm workflow:validate <run-directory>");
  process.exitCode = 2;
} else {
  try {
    const errors = await validateWorkflowDirectory(runDir);
    if (errors.length > 0) {
      for (const error of errors) console.error(error);
      process.exitCode = 1;
    } else {
      console.log(`Valid workflow handoffs: ${runDir}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
