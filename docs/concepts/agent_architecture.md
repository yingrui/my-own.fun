# Agent Architecture Design

This document explains the design and architecture of the AI Agent system in my-own.fun.

## Table of Contents

1. [Core Architecture Pattern](#core-architecture-pattern)
2. [Core Components](#core-components)
3. [Agent Composition Patterns](#agent-composition-patterns)
4. [Execution Flow](#execution-flow)
5. [Design Patterns](#design-patterns)
6. [Key Features](#key-features)
7. [Current Limitations](#current-limitations)
8. [Extension Points](#extension-points)

## Core Architecture Pattern

The system uses a layered, composable agent architecture:

```
Agent (Interface)
    ↓
ThoughtAgent (Base Implementation)
    ↓
CompositeAgent (Tool Delegation)
    ↓
DelegateAgent (Command Routing)
```

### Architecture Hierarchy

- **Agent Interface**: Defines the contract that all agents must implement
- **ThoughtAgent**: Base implementation with core agent logic
- **CompositeAgent**: Extends ThoughtAgent to delegate tools to sub-agents
- **DelegateAgent**: Routes commands and manages agent switching

## Core Components

### A. Agent Interface (`core/Agent.ts`)

The `Agent` interface defines the contract that all agents must implement:

**Key Methods:**
- `plan()`: Analyze user intent and decide what actions to take
- `execute()`: Execute the chosen actions
- `reflection()`: Review and improve results (optional self-evaluation)
- `chat()`: Main entry point for user interaction
- `environment()`: Perceive current context/environment

### B. ThoughtAgent (Base Implementation)

`ThoughtAgent` is the main agent class that implements the core agent loop.

#### Execution Flow

```
chat(message)
  → startInteraction()      // Initialize interaction, perceive environment
  → plan()                  // Think: understand goal, choose tool
  → process()               // Execute chosen action
  → observe()               // Read result, reflect if enabled
  → [loop if reflection suggests more actions]
  → completeInteraction()    // Finalize and save
```

#### Key Features

1. **Chain of Thoughts**: Optional goal analysis via `guessGoal()` method
2. **Tool Selection**: Uses LLM function calling to choose appropriate tools
3. **Reflection**: Optional self-evaluation loop that can trigger revisions
4. **Streaming**: Real-time message updates during generation
5. **Error Handling**: Comprehensive error catching and logging

#### Key Methods

- **`plan()`**: Analyzes user intent, optionally sets goal, calls LLM with tools
- **`process()`**: Routes thoughts to execution based on type
- **`execute()`**: Handles built-in actions (`chat`, `reply`, `revise`) or delegates to tools
- **`observe()`**: Reads results and triggers reflection if enabled

### C. Thought System (`core/Thought.ts`)

The `Thought` class represents agent decisions/results.

#### Thought Types

- `"actions"`: Agent should execute tool(s)
- `"message"`: Direct text response (no tools needed)
- `"stream"`: Streaming response (real-time generation)
- `"functionReturn"`: Tool execution result (needs processing)
- `"error"`: Error occurred

#### Features

- Supports reasoning models (Ollama format with `<think>` tags)
- Streaming support with real-time callbacks
- Message extraction from different thought types

### D. Interaction System (`core/Interaction.ts`)

Tracks a single user interaction through its lifecycle.

#### Structure

- **`Step[]`**: Each step is either a plan or execute action
- **`status`**: Current state (Start → Planning → Executing → Reflecting → Completed)
- **`goal`**: User intent (extracted from planning step)
- **`intent`**: Specific tool/action chosen
- **`environment`**: Context snapshot

#### Step Types

- **`plan`**: Goal analysis step (understanding user intent)
- **`execute`**: Action execution step (running tools)

Each step tracks:
- Reasoning (internal thought process)
- Content (user-facing output)
- Action name and arguments
- ActionResult (tool return value)
- Error (if failed)

### E. Conversation (`core/Conversation.ts`)

Manages conversation history and context.

#### Structure

- **`Interaction[]`**: List of user-assistant exchanges
- Each interaction contains input/output messages and steps
- Context length management for token limits
- Serialization for persistence

## Agent Composition Patterns

### A. CompositeAgent

Delegates tools to sub-agents rather than executing them directly.

#### Design

- Extends `ThoughtAgent`
- Maintains `mapToolsAgents`: Maps tool name → responsible agent
- When tool is selected, delegates to the mapped agent
- Aggregates tools from sub-agents

#### Use Case

Multiple specialized agents, one coordinator that routes to the right specialist.

**Example:**
```typescript
const coordinator = new CompositeAgent(props, "Coordinator", "Routes tasks", [
  searchAgent,    // Handles search tools
  pageAgent,      // Handles page analysis tools
  writeAgent      // Handles writing tools
]);
```

### B. DelegateAgent

Routes commands and manages agent switching.

#### Design

- Implements `Agent` interface (not extending ThoughtAgent)
- Manages `currentAgent` and `initAgent`
- Parses commands: `/command` or `@agent`
- Routes to appropriate agent based on command

#### Features

- Command parsing (`/ask_page`, `/summary`)
- Agent switching (`@agentName`)
- Fallback to chitchat if tool not found

#### Use Case

Multi-agent system with explicit command routing.

**Example:**
```typescript
const delegate = new DelegateAgent(
  defaultAgent,
  [searchAgent, pageAgent],
  [{value: "search", label: "Search"}, {value: "ask", label: "Ask"}]
);

// User: "/search python tutorials"
// → Routes to searchAgent

// User: "@pageAgent summarize this page"
// → Routes to pageAgent
```

## Execution Flow

### Main Chat Flow

```typescript
chat(message)
  ├─ startInteraction()           // Create interaction, perceive environment
  ├─ plan()                       // Analyze intent, choose tool
  │   ├─ guessGoal() [optional]   // Chain of thoughts goal analysis
  │   └─ toolsCall()               // LLM selects tool/action
  ├─ process(thought)             // Route based on thought type
  │   ├─ if "actions" → check() → execute() → postprocess()
  │   ├─ if "message/stream" → replyAction() → execute()
  │   └─ if "error" → handle error
  ├─ observe(result)              // Read message, trigger reflection
  │   └─ reflection() [if enabled] // Self-evaluate, may return revise action
  └─ completeInteraction()        // Save final result
```

### Action Execution Flow

```typescript
execute(actions)
  ├─ Built-in actions:
  │   ├─ "chat" → generateChatReply()
  │   ├─ "reply" → return thought directly
  │   └─ "revise" → reflectionService.revise()
  ├─ Tool invocation:
  │   ├─ Try invokeTool() (decorator-based)
  │   └─ Fallback to executeAction() (subclass override)
  └─ Error handling
```

### Reflection Loop

When reflection is enabled:

```
observe(result)
  → readMessage(result)
  → reflection()
    → reviewConversation()
    → if "finished" → return previous message
    → if "suggest" → return revise action
    → if "actions" → return actions
  → [loop back to process if actions returned]
```

## Design Patterns

The architecture uses several design patterns:

1. **Strategy Pattern**: Different agents implement the same interface
2. **Decorator Pattern**: Tool methods via decorators (`@tool`)
3. **Composite Pattern**: CompositeAgent aggregates sub-agents
4. **Observer Pattern**: Listener pattern for state changes
5. **Template Method Pattern**: ThoughtAgent defines flow, subclasses customize
6. **Factory Pattern**: AgentFactory creates configured agents

## Key Features

### 1. Modularity
- Agents can be composed and extended
- Clear separation of concerns
- Easy to add new agents

### 2. Observability
- State changes notify listeners
- Real-time UI updates
- Debugging support

### 3. Streaming
- Real-time message updates
- Progressive rendering
- Better UX

### 4. Reflection
- Optional self-improvement loop
- Quality evaluation
- Automatic revision

### 5. Context Awareness
- Environment perception
- Context length management
- Conversation history

### 6. Tool-Based
- Function calling for tool selection
- Decorator-based tool registration
- Flexible tool execution

### 7. Multi-Modal
- Optional image/video support
- Visual context understanding
- Rich content handling

### 8. Reasoning
- Optional chain-of-thought reasoning
- Goal analysis
- Step-by-step planning

## Current Limitations

1. **Single Action Execution**: Only executes first action (TODO: support multiple)
2. **Reflection Loop**: Could run indefinitely (has safeguard with MAX_REFLECTION_ITERATIONS)
3. **Type Safety**: Some `any` types remain (improved in recent refactoring)
4. **Error Recovery**: Limited retry logic
5. **Empty Methods**: `reflectionCompleted()` not fully implemented

## Extension Points

### 1. Custom Tool Handling

Override `executeAction()` method:

```typescript
class CustomAgent extends ThoughtAgent {
  async executeAction(
    action: string,
    args: object,
    conversation: Conversation,
  ): Promise<Thought> {
    // Custom tool execution logic
    if (action === "myCustomTool") {
      // Handle custom tool
      return new Thought({ type: "message", message: "Result" });
    }
    return super.executeAction(action, args, conversation);
  }
}
```

### 2. Custom Environment Perception

Override `environment()` method:

```typescript
class CustomAgent extends ThoughtAgent {
  async environment(): Promise<Environment> {
    return {
      systemPrompt: async () => {
        // Custom environment description
        return "Current page: ...";
      }
    };
  }
}
```

### 3. Tool Registration

Use decorators to add tools:

```typescript
class CustomAgent extends ThoughtAgent {
  @tool({
    name: "myTool",
    description: "Does something useful",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" }
      }
    }
  })
  async myTool(args: { query: string }): Promise<string> {
    // Tool implementation
    return "Result";
  }
}
```

### 4. Agent Composition

Create composite agents:

```typescript
const composite = new CompositeAgent(
  props,
  "MyAgent",
  "Description",
  [agent1, agent2, agent3]
);
```

### 5. Command Routing

Create delegate agents:

```typescript
const delegate = new DelegateAgent(
  defaultAgent,
  [specializedAgent1, specializedAgent2],
  [{value: "cmd1", label: "Command 1"}]
);
```

## Summary

The agent architecture is designed to be:

- **Flexible**: Easy to extend and customize
- **Composable**: Agents can be combined in various ways
- **Observable**: State changes are tracked and notified
- **Robust**: Error handling and safeguards in place
- **Efficient**: Streaming and context management

This design enables building complex, multi-agent systems while keeping individual agents simple and focused. The architecture supports both simple single-agent use cases and complex multi-agent coordination scenarios.

