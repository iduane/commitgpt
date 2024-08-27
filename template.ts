// export const defaultPromptTemplate = [
//   "suggest 10 commit messages based on the following diff:",
//   "{{diff}}",
//   "",
//   "commit messages should:",
//   " - follow conventional commits",
//   " - message format should be: <type>[scope]: <description>",

//   "",
//   "examples:",
//   " - fix(authentication): add password regex pattern",
//   " - feat(storage): add new test cases",
// ].join("\n");


export const defaultPromptTemplate = `Given the git changes below, please draft a concise commit message that accurately summarizes the modifications. Follow these guidelines:

  1. Limit your commit message to 150 words.
  2. follow conventional commits
  3. message format should be: <type>[scope]: <description>

examples:
  - fix(authentication): add password regex pattern; feat(storage): add new test cases
  - feat(storage): add new test cases

Git Changes:

{{diff}}`;