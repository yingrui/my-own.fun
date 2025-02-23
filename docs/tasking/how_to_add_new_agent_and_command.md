## Add an Agent and Command for Google Search

This document will guide you on how to add a new agent and command to the gru.ai. 

The new agent will be used to search on Google, and user can use the `/google` command to trigger the agent.

* The agent should be a Typescript class that inherits from `AgentWithTools` and implements the `executeCommand` method. The `executeCommand` method should return `Promise<Stream<ChatCompletionChunk> | ChatCompletion>`. 
* The agent should also implement a `search` method that takes a search query as input and returns the search results.
* The agent should be added to the agent list in the `AgentFactory` class.

### Tasking
1. Add a new agent to the `src/pages/sidepanel/agents` directory.
2. Implement the `executeCommand` method in the agent.
3. Be able to check and open google webpage and get search result in `search` method.
4. Send prompt to gpt service and get result in `search` method.
5. Add the agent to the agent list in the `AgentFactory` class.
6. Add the `/google` command to the `Gru` commands list.
7. Test the new agent and command in side panel.

### Step 1: Add a new agent
Add a new agent to the `src/pages/sidepanel/agents` directory. This agent should declare that it can handle the `google` command in constructor.
```typescript
// This is the GoogleAgent, it can be used to search on Google
class GoogleAgent extends AgentWithTools {
  constructor(defaultModelName: string, client: OpenAI) {
    super(defaultModelName, client);
    this.addTool(
      "google",
      "search content from google according to user questions",
      ["userInput"],
    );
  }
  ...
```

### Step 2: Implement the `executeCommand` method
Implement the `executeCommand` method in the agent. The method should take a command and arguments as input and return the result of the command. The method should throw an error if the command is not recognized.
```typescript
async executeCommand(command: string, args: object): Promise<any> {
 if (command === "google") {
   return this.search(args["userInput"]);
 }
 throw new Error("Unexpected tool call in GoogleAgent: " + command);
}
```

### Step 3: Implement the `search` method
Implement the `search` method in the agent. The method should take a search query as input and return the search results. The method should use the `openai` client to make the search request.
```typescript
async search(userInput: string): Promise<any> {
  // This method is used to open Google and wait for the search result.
 const url = await this.openGoogle(userInput);
 const content = await this.get_google_result(url, userInput);
 const prompt = `...`;
 // Then summarize the search result for user.
 return await this.chatCompletion([
   { role: "system", content: prompt },
   { role: "user", content: "please summarize this page: " },
 ]);
```

### Step 4: Add the agent to the agent list
* Add the agent to the AgentFactory in file `src/pages/sidepanel/agents/agents.ts`.
```typescript
class AgentFactory {
  ...
  private static createAgents(): AgentWithTools[] {
    return [
      ...
      new GoogleAgent(defaultModel, client),
    ]
  }
}
```

### Step 5: Add the `/google` command to Gru
* Add command `google` to Gru commands list. So when use type `/google` command, the agent can recognize it as command and then trigger the GoogleAgent.

```typescript
class Gru extends ThoughtAgent {
  ...
  commands = [
    "ask_page",
    "google",
    ...
  ];
  ...
}
```