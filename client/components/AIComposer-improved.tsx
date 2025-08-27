// 改进方案示例 - 建议的文档上下文处理方式

const sendMessage = async () => {
  if (!inputValue.trim() || isLoading) return;
  if (!settings.llm.apiKey) {
    ErrorHandler.showWarning("API Key Required", "Please configure your API key in settings first!");
    return;
  }

  // 方案1：对话开始时注入文档上下文（推荐）
  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user", 
    content: inputValue.trim(),
    timestamp: new Date(),
  };

  let session = currentSession;
  let shouldInjectDocuments = false;

  if (!session) {
    // 新对话 - 如果有选中的文档，在对话开始时注入
    session = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    shouldInjectDocuments = selectedContextDocuments.length > 0;
  }

  // 构建消息历史
  let messages = [...session.messages];

  // 在新对话开始时注入文档上下文
  if (shouldInjectDocuments) {
    const contextMessage: Message = {
      id: (Date.now() - 1).toString(),
      role: "user",
      content: createDocumentContextMessage(selectedContextDocuments),
      timestamp: new Date(),
    };

    const ackMessage: Message = {
      id: Date.now().toString(),
      role: "assistant", 
      content: "I've reviewed the provided documents and I'm ready to help you with questions about them.",
      timestamp: new Date(),
    };

    messages = [contextMessage, ackMessage];
  }

  // 添加当前用户消息
  messages.push(userMessage);

  const updatedSession = {
    ...session,
    messages,
    updatedAt: new Date(),
  };

  setCurrentSession(updatedSession);
  setInputValue("");
  setSelectedContextDocuments([]); // 清除选择，因为已经注入到对话中
  setShowContextSelector(false);
  setIsLoading(true);

  try {
    const llmService = getLLMService(settings);
    
    // 发送纯净的用户消息，依靠对话历史提供上下文
    const response = await llmService.chatWithAI(
      inputValue.trim(), // 纯净的用户输入
      messages.slice(0, -1) // 包含文档上下文的对话历史
    );

    // ... 处理响应的代码保持不变
  } catch (error) {
    ErrorHandler.handle(error, "AI Chat");
  } finally {
    setIsLoading(false);
  }
};

// 辅助函数：创建文档上下文消息
function createDocumentContextMessage(documents: Document[]): string {
  const contextSections = documents
    .map((doc) => `## ${doc.title}\n\n${doc.content}\n`)
    .join("\n---\n\n");

  return `I'm sharing some documents for our conversation. Please use these as reference for any questions I might ask:

${contextSections}

Please acknowledge that you've received these documents and are ready to help me with questions about them.`;
}

// 方案2：系统级上下文（备选方案）
// 修改 llmService.ts 中的 callGeminiAPIWithHistory 方法：

async function callGeminiAPIWithHistoryImproved(
  currentMessage: string, 
  conversationHistory: Message[],
  systemContext?: string // 新增系统上下文参数
): Promise<string> {
  // ... 现有代码 ...

  // 在系统提示中包含文档上下文
  const baseSystemPrompt = `You are a helpful AI assistant...`;
  
  const enhancedSystemPrompt = systemContext 
    ? `${baseSystemPrompt}\n\n## Reference Documents:\n${systemContext}\n\nUse these documents to answer questions when relevant.`
    : baseSystemPrompt;

  contents.push({
    role: "user",
    parts: [{ text: enhancedSystemPrompt }]
  });

  // ... 其余代码保持不变
}
