# Proposal: Implement AI Assistant

## Why

The AI assistant enables natural language map editing through DeepSeek Chat integration. Users can request map modifications without manual intervention, and the AI has full access to all system tools. This dramatically reduces the time needed for map adjustments and makes the system accessible to non-technical users. The AI can perform any operation a human could do manually, including creating rivers, placing stamps, adjusting levels, and modifying boundaries.

## What Changes

This task implements the AI assistant:

1. **DeepSeek Chat Integration**:
   - DeepSeek Chat API client
   - Message handling and response processing
   - WebSocket support for streaming responses

2. **Tool Registry**:
   - Registry of all system operations available to AI
   - Tool descriptions and parameter schemas
   - Tool execution and result handling

3. **Command Parser**:
   - Natural language command parsing
   - Intent recognition and parameter extraction
   - Command validation

4. **Context Manager**:
   - Current map state context
   - Active layer and zone context
   - Operation history

5. **Safety Validator**:
   - Operation validation before execution
   - Destructive operation confirmation
   - Error handling and rollback

## Impact

- Affected specs: `AI_ASSISTANT.md`, `API.md` (AI endpoints)
- Affected code:
  - `src/ai/assistant.ts` (new)
  - `src/ai/deepseek-client.ts` (new)
  - `src/ai/tool-registry.ts` (new)
  - `src/ai/command-parser.ts` (new)
  - `src/ai/context-manager.ts` (new)
  - `src/ai/safety-validator.ts` (new)
- Breaking change: NO (new feature)
- User benefit: Enables natural language map editing with full system access
