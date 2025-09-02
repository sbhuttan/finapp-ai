export type AgentToolConfig = {
  type: "web_search";                 // for now we only add Bing grounding
  connectionId: string;               // BING_GROUNDING_CONNECTION_ID
};

export type AgentDefinition = {
  name: string;
  model: string;
  instructions: string;
  tools?: AgentToolConfig[];
};

export type AgentRunOptions = {
  input: string;                      // user turn content
  temperature?: number;
  maxTokens?: number;
  jsonExpected?: boolean;             // if true, we'll attempt to extract JSON from the final message
  timeoutMs?: number;
};

export type AgentRunResult<T = unknown> = {
  ok: boolean;
  provider: "azure-foundry";
  outputText?: string;
  outputJson?: T | null;
  error?: string;
  asOf?: string;                      // ISO timestamp
};
