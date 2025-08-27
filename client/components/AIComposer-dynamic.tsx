// 动态上下文管理方案 - 处理中途插入和文档变化

interface DocumentSnapshot {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
}

interface SessionContext {
  documents: DocumentSnapshot[];
  lastUpdate: Date;
}

// 在AIComposer组件中添加状态管理
const [sessionContext, setSessionContext] = useState<SessionContext>({
  documents: [],
  lastUpdate: new Date()
});

const sendMessage = async () => {
  if (!inputValue.trim() || isLoading) return;
  if (!settings.llm.apiKey) {
    ErrorHandler.showWarning("API Key Required", "Please configure your API key in settings first!");
    return;
  }

  // 检查文档上下文是否需要更新
  const contextNeedsUpdate = checkIfContextNeedsUpdate();
  
  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: inputValue.trim(),
    timestamp: new Date(),
  };

  let session = currentSession;
  let messages = session ? [...session.messages] : [];

  // 方案A: 智能上下文管理（推荐）
  if (contextNeedsUpdate) {
    const contextUpdateMessage = createContextUpdateMessage();
    if (contextUpdateMessage) {
      messages.push(contextUpdateMessage);
    }
  }

  // 添加用户消息
  messages.push(userMessage);

  const updatedSession = {
    ...session || createNewSession(),
    messages,
    updatedAt: new Date(),
  };

  setCurrentSession(updatedSession);
  setInputValue("");
  updateSessionContext(); // 更新会话上下文记录
  setIsLoading(true);

  try {
    const llmService = getLLMService(settings);
    
    // 根据情况选择发送方式
    const response = contextNeedsUpdate 
      ? await llmService.chatWithAI(userMessage.content, messages.slice(0, -1))
      : await llmService.chatWithAI(userMessage.content, session?.messages || []);

    // 处理AI响应...
  } catch (error) {
    ErrorHandler.handle(error, "AI Chat");
  } finally {
    setIsLoading(false);
  }
};

// 检查上下文是否需要更新
function checkIfContextNeedsUpdate(): boolean {
  // 1. 检查是否有新添加的文档
  const currentDocIds = selectedContextDocuments.map(d => d.id);
  const sessionDocIds = sessionContext.documents.map(d => d.id);
  
  const hasNewDocs = currentDocIds.some(id => !sessionDocIds.includes(id));
  const hasRemovedDocs = sessionDocIds.some(id => !currentDocIds.includes(id));
  
  // 2. 检查现有文档内容是否发生变化
  const hasContentChanges = selectedContextDocuments.some(doc => {
    const sessionDoc = sessionContext.documents.find(d => d.id === doc.id);
    return sessionDoc && sessionDoc.content !== doc.content;
  });

  return hasNewDocs || hasRemovedDocs || hasContentChanges;
}

// 创建上下文更新消息
function createContextUpdateMessage(): Message | null {
  if (selectedContextDocuments.length === 0 && sessionContext.documents.length === 0) {
    return null;
  }

  let updateText = "";

  // 检查新增文档
  const newDocs = selectedContextDocuments.filter(doc => 
    !sessionContext.documents.some(d => d.id === doc.id)
  );

  // 检查移除的文档
  const removedDocs = sessionContext.documents.filter(sessionDoc =>
    !selectedContextDocuments.some(d => d.id === sessionDoc.id)
  );

  // 检查内容变化的文档
  const changedDocs = selectedContextDocuments.filter(doc => {
    const sessionDoc = sessionContext.documents.find(d => d.id === doc.id);
    return sessionDoc && sessionDoc.content !== doc.content;
  });

  // 构建更新消息
  if (newDocs.length > 0) {
    updateText += "## New Documents Added:\n\n";
    newDocs.forEach(doc => {
      updateText += `### ${doc.title}\n\n${doc.content}\n\n---\n\n`;
    });
  }

  if (changedDocs.length > 0) {
    updateText += "## Updated Documents:\n\n";
    changedDocs.forEach(doc => {
      updateText += `### ${doc.title} (Updated)\n\n${doc.content}\n\n---\n\n`;
    });
  }

  if (removedDocs.length > 0) {
    updateText += "## Documents Removed:\n\n";
    removedDocs.forEach(doc => {
      updateText += `- ${doc.title}\n`;
    });
    updateText += "\nPlease ignore the removed documents for future questions.\n\n";
  }

  if (!updateText) return null;

  return {
    id: (Date.now() - 1).toString(),
    role: "user",
    content: `[Context Update] ${updateText}Please acknowledge these changes and use the updated document context for our conversation.`,
    timestamp: new Date(),
  };
}

// 更新会话上下文记录
function updateSessionContext() {
  setSessionContext({
    documents: selectedContextDocuments.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      timestamp: new Date()
    })),
    lastUpdate: new Date()
  });
}

// 方案B: 混合方案（备选）
// 结合对话级注入 + 动态更新的混合方式

function createHybridPrompt(userInput: string): string {
  // 检查是否有上下文变化
  const contextChanges = getContextChanges();
  
  if (contextChanges.hasChanges) {
    // 如果有变化，在用户消息中包含最新的文档上下文
    const contextSection = selectedContextDocuments
      .map(doc => `### ${doc.title}\n\n${doc.content}\n\n---\n`)
      .join("\n");

    return `[Updated Context]
    
${contextSection}

User Message: ${userInput}

Please use the above updated context to answer my question.`;
  }
  
  // 如果没有变化，返回纯净的用户输入
  return userInput;
}

// 方案C: 实时上下文策略（最灵活但token消耗高）
function createRealtimeContextPrompt(userInput: string): string {
  if (selectedContextDocuments.length === 0) {
    return userInput;
  }

  const contextSection = selectedContextDocuments
    .map(doc => `### Document: ${doc.title}\n\n${doc.content}\n\n---\n`)
    .join("\n");

  return `Current Context Documents:

${contextSection}

User Question: ${userInput}

Please answer based on the current context documents.`;
}
