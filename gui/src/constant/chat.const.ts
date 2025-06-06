type ChatModelsType = "llama" | "gpt";

// 模型
export const ChatModelsEnum = {
  "Llama 3": {
    value: "llama3.2",
    label: "llama3(本地)",
    type: "llama" as ChatModelsType,
  },
  starcoder2: {
    value: "starcoder2",
    label: "StarCoder2(本地)",
    type: "llama" as ChatModelsType,
  },
  "deepseek-coder": {
    value: "deepseek-coder:latest",
    label: "DeepSeekCoder(本地)",
    serviceMethod: "chatOllamaGenerate",
    type: "llama" as ChatModelsType,
  },
  "gpt-4o": {
    value: "gpt-4o",
    label: "Gpt-4o 128上下文",
    type: "gpt" as ChatModelsType,
  },
};

export type ChatModelsKey = keyof typeof ChatModelsEnum;
