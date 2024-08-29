#!/usr/bin/env node
import { execSync } from "child_process";

import enquirer from "enquirer";
import ora from "ora";

import { ChatGPTClient } from "./client.js";
import { getConfig, loadPromptTemplate } from "./config_storage.js";

const debug = (...args: unknown[]) => {
  if (process.env.DEBUG) {
    console.debug(...args);
  }
};

const CUSTOM_MESSAGE_OPTION = "[write own message]...";
const spinner = ora();
let diff = "";

let diffCMD = getConfig<string>('diffCMD');
if (!diffCMD) {
  // try run git status or svn status to detect the version control system automatically
  const vcs = detectVCS();
  if (!vcs) {
    console.log("No supported version control system detected.");
    process.exit(1);
  }

  diffCMD = vcs === "git" ? "git diff --cached" : "svn diff --git -x -w";
}
try {
  diff = execSync(diffCMD).toString();
  if (!diff) {
    console.log("No changes to commit.");
    process.exit(0);
  }
} catch (e) {
  console.log(`Failed to run ${diffCMD}`);
  process.exit(1);
}

run(diff)
  .then(() => {
    process.exit(0);
  })
  .catch((e: Error) => {
    console.log("Error: " + e.message, e.cause ?? "");
    process.exit(1);
  });

async function run(diff: string) {
  // TODO: we should use a good tokenizer here
  const diffTokens = diff.split(" ").length;
  if (diffTokens > 30000) {
    console.log(`Diff is way too big. Truncating to 30000 tokens. It may help`);
    diff = diff.split(" ").slice(0, 30000).join(" ");
  }

  const api = new ChatGPTClient();

  const promptTemplate = loadPromptTemplate();
  const userMessage = promptTemplate.replace("{{diff}}", ["```", diff, "```"].join("\n"));

  const messages = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: userMessage }
  ];

  while (true) {
    debug("prompt: ", userMessage);
    const response = await api.getAnswer(userMessage);

    const choices = [response];
    try {
      const answer = await enquirer.prompt<{ message: string }>({
        type: "select",
        name: "message",
        message: "Pick a message",
        choices,
      });

      let commitCMD = getConfig<string>('commitCMD');
      if (!commitCMD) {
        // try run git status or svn status to detect the version control system automatically
        const vcs = detectVCS();
        if (!vcs) {
          console.log("No supported version control system detected.");
          process.exit(1);
        }

        commitCMD = vcs === "git" ? "git commit" : "svn commit";
      }

      
      if (answer.message === CUSTOM_MESSAGE_OPTION) {
        execSync(commitCMD, { stdio: "inherit" });
        return;
      } else {
        execSync(`${commitCMD} -m '${escapeCommitMessage(answer.message)}'`, {
          stdio: "inherit",
        });
        return;
      }
    } catch (e) {
      console.log("Aborted.");
      console.log(e);
      process.exit(1);
    }
  }
}

async function getMessages(api: ChatGPTClient, request: string) {
  spinner.start("Asking ChatGPT 🤖 for commit messages...");

  // send a message and wait for the response
  try {
    const response = await api.getAnswer(request);
    // find json array of strings in the response
    const messages = response
      .split("\n")
      .map(normalizeMessage)
      .filter((l) => l.length > 1);

    spinner.stop();

    debug("response: ", response);

    messages.push(CUSTOM_MESSAGE_OPTION);
    return messages;
  } catch (e) {
    spinner.stop();
    if (e.message === "Unauthorized") {
      return getMessages(api, request);
    } else {
      throw e;
    }
  }
}

function normalizeMessage(line: string) {
  return line
    .trim()
    .replace(/^(\d+\.|-|\*)\s+/, "")
    .replace(/^[`"']/, "")
    .replace(/[`"']$/, "")
    .replace(/[`"']:/, ":") // sometimes it formats messages like this: `feat`: message
    .replace(/:[`"']/, ":") // sometimes it formats messages like this: `feat:` message
    .replace(/\\n/g, "")
    .trim();
}

function escapeCommitMessage(message: string) {
  return message.replace(/'/, `''`);
}

// Function to detect the version control system
function detectVCS(): string | null {
  try {
    execSync("git status", { stdio: 'ignore', });
    return "git";
  } catch (e) {
    try {
      execSync("svn status", { stdio: 'ignore' });
      return "svn";
    } catch (e) {
      return null;
    }
  }
}