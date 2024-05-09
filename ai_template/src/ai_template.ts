// Usage
import { ChatHistory, Action, ActionProps, uuid, ServiceProvider, LLMProviderBase, LLMUtil } from "@enconvo/api";
import { SystemMessage } from "@langchain/core/messages";
import { HumanMessagePromptTemplate } from "@langchain/core/prompts";

export default async function main(req: Request) {

    const requestId = uuid()
    console.log("hello--")

    const { options } = await req.json();
    const { text, context, llm } = options;

    // content to be processed
    let content = text || context;

    if (!content) {
        throw new Error("No text to process");
    }

    const chat: LLMProviderBase = ServiceProvider.load(llm);


    const template = HumanMessagePromptTemplate.fromTemplate(
        `Hello,please translate this text: {text} to Japanese.`,
    );

    const humanMessage = await template.format({
        text: content,
    });

    const messages = [
        new SystemMessage('You are an translator'),
        humanMessage
    ];


    const llmResult = await chat.call({ messages })
    const result = await LLMUtil.invokeLLMStream(llmResult.stream, options)

    // save the chat history
    await ChatHistory.saveChatMessages({
        input: content, output: result, llmOptions: llm, requestId
    });


    // actions to be displayed in SmartBar
    const actions: ActionProps[] = [
        Action.Paste({ content: result }),
        Action.Copy({ content: result }),
        Action.PlayAudio({
            title: "Play Translation Content",
            content: result,
            ttsOptions: options.tts_providers
        }),
        Action.PlayAudio({
            title: "Play Original Content",
            content: content,
            ttsOptions: options.tts_providers
        }),
        Action.PauseResumeAudio()
    ]

    const output = {
        content: result,
        actions: actions
    }

    return output;
}
