# Commands

## Main Commands

- `nitro "Your request"`
  - Ask Nitro to execute a request
  - Note: Pattern match requests with all commands first to prevent `nitro "settings"` from executing a request instead of a command
  - In addition, if the request is only a single word, then throw a usage error as the user is likely trying to execute a subcommand and not a request.
- `nitro continue "Your request"`, `nitro c "Your request"`
  - Continue the last conversation with Nitro
- `nitro strict "Your request here"`, `nitro s "Your request here"`
  - Ask Nitro to run a command and always manually confirm every command
  - Useful if asking to execute complex or dangerous request

## Settings Commands

- `nitro settings`: Allows users to toggle settings

## Provider Commands

- `nitro provider add`: Allow users to add a provider
- `nitro provider list`: Allows users to list providers
- `nitro provider edit`: Allows users to edit provider details
- `nitro provider remove`: Allows users to remove a provider
- `nitro provider default`: Allows users to set the default provider
