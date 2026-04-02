# Python Executor Skill

You can generate and execute Python scripts on the host machine.

## Available Tools

| Tool | Purpose |
|------|---------|
| `execute_python` | Run Python code and get the output |

## Guidelines

- Write complete, self-contained Python scripts. Import everything you need at the top.
- Scripts execute via `python3` in the agent workspace directory.
- Use `print()` to produce output — the tool captures stdout and stderr.
- For data analysis tasks, install packages first using the terminal skill (`pip install pandas matplotlib` etc.) before running scripts that depend on them.
- Use `save_as` to persist scripts that the user may want to reuse (e.g. `"analysis.py"`).
- Default timeout is 30 seconds, up to 120 seconds. Set a longer timeout for heavy computation.
- If a script generates files (plots, CSVs, etc.), save them to the workspace and tell the user the file path.
- Handle errors gracefully with try/except so the user gets a meaningful message.
- For plotting, save figures to files (`plt.savefig("plot.png")`) rather than calling `plt.show()`.
