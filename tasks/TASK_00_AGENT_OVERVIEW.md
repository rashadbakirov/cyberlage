# TASK_00_AGENT_OVERVIEW

## Goal
Interactive end-to-end deployment where the agent guides the user step-by-step.

## Working Mode (Always Interactive)
- Explain each step briefly and wait for confirmation.
- Do not assume resources already exist.
- If any value is missing, ask for it.

## Two Modes
1. **Agent creates resources** (default)
2. **User provides existing resource details**

## Zero-Touch Mode

If all values are provided up front (`docs/AGENT_ZERO_TOUCH_PROMPT.md`), execute without follow-up questions and return:
- resource names
- final URL
- validation report

## Azure OpenAI Note
If Azure OpenAI resource creation is blocked:
- request endpoint/key/deployment from user
- AI features (briefing/chat) remain disabled without these values
