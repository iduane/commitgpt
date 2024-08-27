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
    const { model, maxTokens, temperature } = await getPromptOptions();

    try {
      const result = await openai.createCompletion({
        model,
        prompt: question,
        max_tokens: maxTokens,
        temperature,
      });
      console.debug('--------Received Response-------');
      console.debug(result.data);
      console.debug('--------Received Response End-------');
      return result.data.choices[0].text;
    } catch (e) {
      console.error(e?.response ?? e);
      throw e;
    }

    // @ts-ignore
  }
}
