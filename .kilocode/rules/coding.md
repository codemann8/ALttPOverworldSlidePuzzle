# Coding Rules for AI Assistants

This file contains specific rules and guidelines for AI coding assistants working on this repository.

## Testing and Execution Rules

### Browser Testing
- **DO NOT** open browsers or attempt to test the application yourself unless explicitly requested by the user
- **DO NOT** assume how the application will behave in a browser
- **ALWAYS** ask the user to test changes in their browser and report results
- When changes are made, provide clear testing instructions for the user

### Terminal Commands
- **DO NOT** execute terminal commands unless explicitly requested by the user
- **DO NOT** run build scripts, package managers, or any CLI tools without permission
- If a command seems necessary, **ASK** the user if they want you to run it
- Exception: You may suggest commands for the user to run themselves

## Project-Specific Rules

### Three-File Architecture
This project uses a strict three-file structure:
- [`puzzle.html`](puzzle.html) - Structure only
- [`puzzle.css`](puzzle.css) - Styling only  
- [`puzzle.js`](puzzle.js) - Logic only

**MAINTAIN** this separation when making changes:
- Don't add inline styles to HTML
- Don't add inline scripts to HTML
- Don't mix concerns between files

### Documentation Updates
- **ALWAYS** update [`.kilocode/rules/general.md`](.kilocode/rules/general.md) after adding new functionality or making significant changes
- Keep the technical documentation comprehensive and accurate
- For player-facing changes (new features, controls, game modes), **CONSIDER** updating [`README.md`](README.md)
- Keep [`README.md`](README.md) brief and user-focused - only include what players need to know

### After Making Changes
- **WAIT** for user confirmation of success
- **PROVIDE** clear testing instructions
- **BE READY** to fix issues based on user feedback
- **DON'T** assume everything works without testing