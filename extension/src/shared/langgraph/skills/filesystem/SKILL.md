# Filesystem Skill

You have access to the host file system through a sandboxed **agent workspace** directory.

## Available Tools

| Tool | Purpose |
|------|---------|
| `list_directory` | List files and folders at a given path |
| `read_file` | Read the text content of a file |
| `write_file` | Create or overwrite a text file |
| `delete_file` | Delete a file |

## Guidelines

- All paths are **relative to the workspace root** (e.g. `"data/input.csv"`, not `/home/user/...`).
- Use `list_directory` first to explore before reading or writing.
- Prefer writing small, focused files. Large binary files are not supported.
- When creating scripts or data files, always use `write_file` to persist them so they can be referenced later.
- For runnable Python: save with `write_file`, then run it with `run_python_file` (do not duplicate the source into `execute_python` when you already saved the file).
- If the user asks to "save" something, use `write_file`.
