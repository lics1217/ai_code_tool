import { useChatStore } from "../index.store";
import useLatest from "../../../hooks/useLatest";
import { streamRequest } from "../utils/streamRequest";
import { ChatMessage, PromptLog, RangeInFileWithContents } from "core";

const status = {
  requestIng: false,
};

export const useSendMsg = () => {
  const { model, inputValue, messages, setState, active } = useChatStore();
  const messageRef = useLatest(messages);
  const activeRef = useLatest(active);
  const modelRef = useLatest(model);

  const sendMessage = async function sendMessage(
    askString?: string,
    rangeInFileWithContents?: RangeInFileWithContents,
  ) {
    if (status.requestIng) return;

    const currentValue = askString || inputValue;

    const value = currentValue.replace(/^\s+|\n+$/g, "");

    setState((state) => {
      state.inputValue = "";
    });

    if (!value) {
      return;
    }
    const msgs = messageRef.current.concat([
      { role: "user", content: value },
      { role: "assistant", content: "", rangeInFileWithContents },
    ]);

    setState((state) => {
      state.messages = msgs;
      state.requestIng = true;
    });
    status.requestIng = true;

    const abortController = new AbortController();
    const cancelToken = abortController.signal;
    const gen = llmStreamChat({
      messages: msgs,
      model: modelRef.current,
      cancelToken,
    });

    setState((state) => {
      state.active = true;
    });

    let next = await gen.next();

    while (!next.done) {
      if (!activeRef.current) {
        // 停止请求
        abortController.abort();
        break;
      }
      const content = next.value.content as string;

      setState((state) => {
        const messageCopy = state.messages;
        messageCopy[messageCopy.length - 1].content += content;

        state.messages = messageCopy;
      });

      next = await gen.next();
    }

    console.log("🚀 ~ sendMessage ~ next:", next);

    setState((state) => {
      state.active = false;
    });
    status.requestIng = false;
  };

  function handlerAbort() {
    reset();
  }

  function reset() {
    setState((state) => {
      state.requestIng = false;
      state.active = false;
    });
    status.requestIng = false;
  }

  return {
    sendMessage,
    handlerAbort,
  };
};

async function* llmStreamChat({
  messages,
  model,
  cancelToken,
}: {
  messages: ChatMessage[];
  model: string;
  cancelToken: AbortSignal;
}): AsyncGenerator<ChatMessage, PromptLog> {
  console.log("🚀 ~ messages:", messages);
  const response = streamRequest(
    "llm/streamChat",
    {
      messages,
      completionOptions: {},
      title: model,
    },
    cancelToken,
  );

  let next = await response.next();

  while (!next.done) {
    yield { role: "user", content: next.value as unknown as string };
    next = await response.next();
  }

  return {
    modelTitle: next.value.content?.modelTitle,
    prompt: next.value.content?.prompt,
    completion: next.value.content?.completion,
    completionOptions: next.value.content?.completionOptions,
  };
}
