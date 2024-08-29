// Adapted from: https://github.com/wong2/chat-gpt-google-extension/blob/main/background/index.mjs

import { Configuration, OpenAIApi } from "openai";
import { getApiKey, getPromptOptions } from "./config.js";
import { getConfig } from "./config_storage.js";

const configuration = new Configuration({
  apiKey: await getApiKey(),
  basePath: getConfig<string>("basePath") || "https://api.openai.com/v1",
});
const openai = new OpenAIApi(configuration);


export class ChatGPTClient {
  async getAnswer(question: string): Promise<string> {
    if (question.length > 20000) {
      question = question.slice(0, 20000);
    }

    const { model, maxTokens, temperature } = await getPromptOptions();
    
    try {
      const result = await openai.createChatCompletion({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: question }
        ],
        max_tokens: maxTokens,
        temperature,
      });
      debug('--------Received Response-------');
      debug(result.data);
      debug('--------Received Response End-------');
      return result.data.choices[0].message.content.trim();
    } catch (e) {
      console.error(e?.response ?? e);
      throw e;
    }
  }
}

const debug = (...args: unknown[]) => {
  if (process.env.DEBUG) {
    console.debug(...args);
  }
};