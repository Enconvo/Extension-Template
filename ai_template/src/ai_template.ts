// Usage
import { ChatHistory, Clipboard, res, Action, ActionProps, uuid, Command } from "@enconvo/api";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SystemMessage } from "@langchain/core/messages";
import { HumanMessagePromptTemplate } from "@langchain/core/prompts";


export default async function main(req: Request) {
    const requestId = uuid()

    const { options } = await req.json();
    const { text, context } = options;

    // content to be processed
    let content = text || context || await Clipboard.selectedText();

    if (!content) {
        throw new Error("No text to process");
    }

    // show a user message in SmartBar
    await res.context({ id: requestId, role: "human", content: content })


    const chat: BaseChatModel = Command.load(options.llm);


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



    const stream = await chat.stream(
        messages,
    );

    let result = "";
    for await (const chunk of stream) {
        const token = chunk.content as string;
        result += token;
        await res.write(token)
    }


    // save the chat history
    await ChatHistory.saveChatMessages({
        input: content, output: result, llmOptions: options.llm, requestId
    });


    // actions to be displayed in SmartBar
    const actions: ActionProps[] = [
        Action.Paste(result, true),
        Action.PlayAudio(content, "Play Original Audio", false, options.tts),
        Action.PlayAudio(result, "Play Translation Audio", false, options.tts),
        Action.Copy(result)
    ]

    const output = {
        content: result,
        actions: actions
    }

    return output;
}
