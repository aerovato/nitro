# Tools

Nitro agents will have access to two primary tools:

- AskUser: Used to ask questions and narrow user intent
- Bash: Used to request to execute Bash commands on behalf of the user

## AskUser

Used to ask the user one or more questions. Each question may come with one or more predetermined choices offered by the agent. The choices should only cover the most common possibilities and serve as a shorthand for the user to select from.

Default: do not ask. Act with sensible defaults. Ask only when intent is unclear and a wrong guess is costly, or when a destructive action has an ambiguous target set. Never ask to confirm tool choice, flags, or formats the user already implied.

If no choices are adequate, users will have the option to type their own answer via selecting the "Type your own answer..." choice. The "Type your own answer..." choice is automatically appended by us and the agent does not need to add it themselves. If the agent does not present any choices, then we select "Type your own answer..." automatically and present the user with a text box.

Input:

```ts
type Question = {
  title: string;
  question: string;
  choices: {
    label: string;
    description?: string;
  }[];
};

type AskUserModelInput = {
  questions: Question[];
};
```

Example Usage:

- Context: User wants to move all files from folder_1 to folder_2. However, agent runs ls on both folders and finds files with the same name.
- Tool Use: Agent uses tool with the following:
  - Question: "Should we overwrite the files in folder_2?"
  - Choices:
    - Yes, overwrite
      - Overwrite all files with the same name in folder_2
    - Backup folder_2, then overwrite
      - Make a copy of folder_2 to folder_2_backup, then overwrite
    - Type your own answer...

## Bash

Used to run Bash commands.

Approvals: Users may or may not need to manually approve each Bash command depending on the safety configuration. If users have to approve a command, a prompt will pop up with the following choices:

- Approve: Approve running of the command
- Reject: Reject the command and pop up an input box for the user to write a rejection message
- Cancel: Cancel running the command and exit the conversation
  The command output will be passed back to the agent. Both stdout and stderr will be provided; stdout lines will be prefixed with "out:\t" and stderr lines will be prefixed with "err:\t".

Input:

```ts
type RiskLevel = "Read Only" | "Normal" | "Dangerous" | "Extremely Dangerous";

type BehaviorTag =
  | "Safe"
  | "Reversible"
  | "Write"
  | "Delete"
  | "Overwrite"
  | "Side Effects"
  | "Exfiltration";

type BashModelInput = {
  command: string;
  explanation: string;
  behaviorTags: BehaviorTag[];
  riskLevel: RiskLevel;
  timeout: number;
};
```

For more details about risk level and behavior tags, see `safety.md`

Output:

```ts
type BashToolOutput =
  | {
      command: string;
      approved: true;
      commandOutput: string;
      exitCode: number;
    }
  | {
      command: string;
      approved: false;
      rejectionMessage?: string;
    };
```

Example Usage:

- Context: User's request: "Find all files ending in .log in the logs/ directory larger than 100MB and haven't been modified in the last 30 days. Compress to tar.gz then move to archive/2026-april.tar.gz, and then verify that the original files are gone."
- Tool Use: Run the main command directly (paths were given; no preflight ls):

  ```
  Bash({
    command: "find logs/ -name \"*.log\" -size +100M -mtime +30 -print0 | tar -cvzf archive/2026-april.tar.gz --null -T - --remove-files",
    ...
  })
  ```

  - On success, agent exits. Explore only if the command fails or overwrite risk is real and unknown.
