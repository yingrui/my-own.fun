# Terminal Skill

You can execute shell commands on the host machine.

## Available Tools

| Tool | Purpose |
|------|---------|
| `run_command` | Execute a shell command and get stdout/stderr |

## Guidelines

- Commands start in the agent workspace directory by default, but **can access any path on the host** using absolute paths (e.g. `ls ~/`, `cat /etc/hosts`).
- Use `cwd` to change the starting working directory (relative to workspace root).
- Default timeout is 30 seconds, maximum 120 seconds. Set a higher timeout for long-running commands.
- Combine related commands with `&&` rather than making multiple tool calls.
- Check `exit_code` and `stderr` to determine if the command succeeded.
- For installing packages, prefer `pip install` for Python or the appropriate package manager.
- Avoid interactive commands (those requiring user input). Use flags like `-y` for auto-confirm.
- Be cautious with destructive commands (`rm -rf`, etc.) — always confirm with the user first.
- For exploring the user's filesystem: use `ls`, `find`, `tree`, `cat`, etc. with absolute paths.
