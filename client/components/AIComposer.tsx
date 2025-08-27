import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Plus,
  RotateCcw,
  FileText,
  Upload,
  Sparkles,
  Bot,
  User,
  Loader2,
  Copy,
  Undo2,
  Check,
  Edit,
  AtSign,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import { Button } from "./ui/button";
import { AppSettings } from "./SettingsModal";
import { getLLMService } from "../services/llmService";
import { ErrorHandler } from "@/lib/error-handler";
import TypingEffect from "./TypingEffect";
import PreviewRenderer from "./PreviewRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
}

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
}

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

interface AIComposerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  documents?: Document[];
  selectedDocument?: Document | null;
}

export default function AIComposer({
  isOpen,
  onClose,
  settings,
  documents = [],
  selectedDocument = null,
}: AIComposerProps) {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null,
  );
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageViewMode, setMessageViewMode] = useState<{
    [key: string]: "formatted" | "raw" | "preview";
  }>({});
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [selectedContextDocuments, setSelectedContextDocuments] = useState<
    Document[]
  >([]);
  const [sessionContext, setSessionContext] = useState<SessionContext>({
    documents: [],
    lastUpdate: new Date(),
  });
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(
    new Set(),
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("ai-composer-history");
    const savedTemplates = localStorage.getItem("ai-composer-templates");

    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory).map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
        setChatHistory(parsedHistory);
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    }

    if (savedTemplates) {
      try {
        const parsedTemplates = JSON.parse(savedTemplates).map(
          (template: any) => ({
            ...template,
            createdAt: new Date(template.createdAt),
          }),
        );
        setPromptTemplates(parsedTemplates);
      } catch (error) {
        console.error("Error loading prompt templates:", error);
      }
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem("ai-composer-history", JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem(
      "ai-composer-templates",
      JSON.stringify(promptTemplates),
    );
  }, [promptTemplates]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

  // Scroll to bottom during typing effect
  useEffect(() => {
    if (typingMessageId) {
      const scrollInterval = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100); // Scroll every 100ms during typing

      return () => clearInterval(scrollInterval);
    }
  }, [typingMessageId]);

  // Close context selector on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showContextSelector) {
        const target = event.target as Element;
        if (!target.closest(".context-selector-container")) {
          setShowContextSelector(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showContextSelector]);

  // Focus input when component opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const generateSessionTitle = async (
    firstMessage: string,
  ): Promise<string> => {
    try {
      const llmService = getLLMService(settings);
      const titlePrompt = `Generate a short, descriptive title (max 4-5 words) for a chat conversation that starts with this message: "${firstMessage.slice(0, 100)}..."

Return only the title, no quotes or additional text.`;

      const title = await llmService.chatWithAI(titlePrompt);
      return title.trim().replace(/["']/g, "").slice(0, 50);
    } catch (error) {
      console.error("Error generating title:", error);
      return (
        firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "")
      );
    }
  };

  const startNewChat = () => {
    setCurrentSession(null);
    setInputValue("");
    setShowHistory(false);
    setShowTemplates(false);
    // Reset session context when starting new chat
    setSessionContext({
      documents: [],
      lastUpdate: new Date(),
    });
    setSelectedContextDocuments([]);
    setCollapsedMessages(new Set());
  };

  const loadChatSession = (session: ChatSession) => {
    setCurrentSession(session);
    setShowHistory(false);
    setShowTemplates(false);
    // Reset context when loading existing session (for simplicity)
    setSessionContext({
      documents: [],
      lastUpdate: new Date(),
    });
    setSelectedContextDocuments([]);
    setCollapsedMessages(new Set());
  };

  // Check if document context needs updating
  const checkIfContextNeedsUpdate = (): boolean => {
    // 1. Check for newly added documents
    const currentDocIds = selectedContextDocuments.map((d) => d.id);
    const sessionDocIds = sessionContext.documents.map((d) => d.id);

    const hasNewDocs = currentDocIds.some((id) => !sessionDocIds.includes(id));
    const hasRemovedDocs = sessionDocIds.some(
      (id) => !currentDocIds.includes(id),
    );

    // 2. Check for content changes in existing documents
    const hasContentChanges = selectedContextDocuments.some((doc) => {
      const sessionDoc = sessionContext.documents.find((d) => d.id === doc.id);
      return sessionDoc && sessionDoc.content !== doc.content;
    });

    return hasNewDocs || hasRemovedDocs || hasContentChanges;
  };

  // Create context update message
  const createContextUpdateMessage = (): Message | null => {
    if (
      selectedContextDocuments.length === 0 &&
      sessionContext.documents.length === 0
    ) {
      return null;
    }

    let updateText = "";

    // Check for new documents
    const newDocs = selectedContextDocuments.filter(
      (doc) => !sessionContext.documents.some((d) => d.id === doc.id),
    );

    // Check for removed documents
    const removedDocs = sessionContext.documents.filter(
      (sessionDoc) =>
        !selectedContextDocuments.some((d) => d.id === sessionDoc.id),
    );

    // Check for content changes
    const changedDocs = selectedContextDocuments.filter((doc) => {
      const sessionDoc = sessionContext.documents.find((d) => d.id === doc.id);
      return sessionDoc && sessionDoc.content !== doc.content;
    });

    // Build update message
    if (newDocs.length > 0) {
      updateText += "## New Documents Added:\n\n";
      newDocs.forEach((doc) => {
        updateText += `### ${doc.title}\n\n${doc.content}\n\n---\n\n`;
      });
    }

    if (changedDocs.length > 0) {
      updateText += "## Updated Documents:\n\n";
      changedDocs.forEach((doc) => {
        updateText += `### ${doc.title} (Updated)\n\n${doc.content}\n\n---\n\n`;
      });
    }

    if (removedDocs.length > 0) {
      updateText += "## Documents Removed:\n\n";
      removedDocs.forEach((doc) => {
        updateText += `- ${doc.title}\n`;
      });
      updateText +=
        "\nPlease ignore the removed documents for future questions.\n\n";
    }

    if (!updateText) return null;

    return {
      id: (Date.now() - 1).toString(),
      role: "user",
      content: `[Context Update] ${updateText}Please acknowledge these changes and use the updated document context for our conversation.`,
      timestamp: new Date(),
    };
  };

  // Update session context tracking
  const updateSessionContext = () => {
    setSessionContext({
      documents: selectedContextDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        timestamp: new Date(),
      })),
      lastUpdate: new Date(),
    });
  };

  // Create new session helper
  const createNewSession = (): ChatSession => ({
    id: Date.now().toString(),
    title: "New Chat",
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create initial context message for new conversations
  const createInitialContextMessage = (): string => {
    const contextSections = selectedContextDocuments
      .map((doc) => `## ${doc.title}\n\n${doc.content}\n`)
      .join("\n---\n\n");

    return `I'm sharing some documents for our conversation. Please use these as reference for any questions I might ask:

${contextSections}

Please acknowledge that you've received these documents and are ready to help me with questions about them.`;
  };

  // Check if a message is a system context message
  const isSystemContextMessage = (message: Message): boolean => {
    return (
      message.content.includes("I'm sharing some documents") ||
      message.content.includes("[Context Update]") ||
      (message.role === "assistant" &&
        message.content.includes("I've reviewed the provided documents"))
    );
  };

  // Generate summary for collapsed system messages
  const getSystemMessageSummary = (message: Message): string => {
    if (message.content.includes("I'm sharing some documents")) {
      // Try to count documents from the message content
      const docMatches = message.content.match(/## (.+?)(?=\n)/g);
      const docCount = docMatches
        ? docMatches.length
        : selectedContextDocuments.length;
      return `📄 Shared ${docCount} document${docCount !== 1 ? "s" : ""} for context`;
    }
    if (message.content.includes("[Context Update]")) {
      if (message.content.includes("New Documents Added")) {
        return "📄 Added new documents to conversation";
      }
      if (message.content.includes("Updated Documents")) {
        return "📝 Updated document content";
      }
      if (message.content.includes("Documents Removed")) {
        return "🗑️ Removed documents from conversation";
      }
      return "📄 Updated document context";
    }
    if (
      message.role === "assistant" &&
      message.content.includes("I've reviewed")
    ) {
      return "✅ AI acknowledged document context";
    }
    return "🔧 System message";
  };

  // Toggle message collapse state
  const toggleMessageCollapse = (messageId: string) => {
    setCollapsedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (!settings.llm.apiKey) {
      ErrorHandler.showWarning(
        "API Key Required",
        "Please configure your API key in settings first!",
      );
      return;
    }

    // Check if document context needs updating
    const contextNeedsUpdate = checkIfContextNeedsUpdate();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(), // Store original user input for display
      timestamp: new Date(),
    };

    let session = currentSession;
    let messages = session ? [...session.messages] : [];

    // Handle new session with initial context
    if (!session) {
      session = createNewSession();

      // If this is a new conversation and we have documents, inject them at the start
      if (selectedContextDocuments.length > 0) {
        const contextMessage: Message = {
          id: (Date.now() - 2).toString(),
          role: "user",
          content: createInitialContextMessage(),
          timestamp: new Date(),
        };

        const ackMessage: Message = {
          id: (Date.now() - 1).toString(),
          role: "assistant",
          content:
            "I've reviewed the provided documents and I'm ready to help you with questions about them.",
          timestamp: new Date(),
        };

        messages = [contextMessage, ackMessage];

        // Auto-collapse system messages
        setCollapsedMessages((prev) => {
          const newSet = new Set(prev);
          newSet.add(contextMessage.id);
          newSet.add(ackMessage.id);
          return newSet;
        });
      }
    } else if (contextNeedsUpdate) {
      // Add context update message for existing conversation
      const contextUpdateMessage = createContextUpdateMessage();
      if (contextUpdateMessage) {
        messages.push(contextUpdateMessage);

        // Auto-collapse context update messages
        setCollapsedMessages((prev) => {
          const newSet = new Set(prev);
          newSet.add(contextUpdateMessage.id);
          return newSet;
        });
      }
    }

    // Add current user message
    messages.push(userMessage);

    const updatedSession = {
      ...session,
      messages,
      updatedAt: new Date(),
    };

    setCurrentSession(updatedSession);
    setInputValue("");
    updateSessionContext(); // Update context tracking
    setShowContextSelector(false);
    setIsLoading(true);

    try {
      const llmService = getLLMService(settings);
      // Use pure user input with conversation history containing context
      const response = await llmService.chatWithAI(
        userMessage.content,
        updatedSession.messages.slice(0, -1),
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      // Set typing effect for new assistant message
      setTypingMessageId(assistantMessage.id);

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
        updatedAt: new Date(),
      };

      // Generate title for new sessions - check for first user message response
      if (finalSession.title === "New Chat") {
        // Find the first actual user message (not context setup)
        const firstUserMessage = finalSession.messages.find(
          (msg) =>
            msg.role === "user" &&
            !msg.content.includes("I'm sharing some documents"),
        );

        if (firstUserMessage) {
          try {
            const title = await generateSessionTitle(firstUserMessage.content);
            finalSession.title = title;
          } catch (error) {
            console.error("Error generating title:", error);
          }
        }
      }

      setCurrentSession(finalSession);

      // Update history
      setChatHistory((prev) => {
        const existing = prev.find((s) => s.id === finalSession.id);
        if (existing) {
          return prev.map((s) => (s.id === finalSession.id ? finalSession : s));
        } else {
          return [finalSession, ...prev];
        }
      });
    } catch (error) {
      ErrorHandler.handle(error, "AI Chat");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const useTemplate = (template: PromptTemplate) => {
    setInputValue(template.content);
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  const createTemplate = () => {
    if (!templateName.trim() || !templateContent.trim()) return;

    const newTemplate: PromptTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      content: templateContent.trim(),
      createdAt: new Date(),
    };

    setPromptTemplates([newTemplate, ...promptTemplates]);
    setTemplateName("");
    setTemplateContent("");
    setIsCreatingTemplate(false);
  };

  const deleteTemplate = (id: string) => {
    setPromptTemplates(promptTemplates.filter((t) => t.id !== id));
  };

  const deleteChatSession = (sessionId: string) => {
    setChatHistory(chatHistory.filter((s) => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const toggleMessageView = (messageId: string) => {
    setMessageViewMode((prev) => {
      const currentMode = prev[messageId] || "formatted";
      let nextMode: "formatted" | "raw" | "preview";

      if (currentMode === "formatted") {
        nextMode = "preview";
      } else if (currentMode === "preview") {
        nextMode = "raw";
      } else {
        nextMode = "formatted";
      }

      return {
        ...prev,
        [messageId]: nextMode,
      };
    });
  };

  const copyMessage = async (messageContent: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopiedMessageId(messageId);
      // 让��户手动看到复制状态，不自动清除
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const recallMessage = (messageId: string) => {
    if (!currentSession) return;

    const messageIndex = currentSession.messages.findIndex(
      (msg) => msg.id === messageId,
    );
    if (messageIndex === -1) return;

    // Remove the message and all messages after it
    const updatedMessages = currentSession.messages.slice(0, messageIndex);
    const updatedSession = {
      ...currentSession,
      messages: updatedMessages,
      updatedAt: new Date(),
    };

    setCurrentSession(updatedSession);

    // Update in chat history
    setChatHistory((prev) =>
      prev.map((session) =>
        session.id === currentSession.id ? updatedSession : session,
      ),
    );
  };

  const resumeFromMessage = (messageId: string) => {
    if (!currentSession) return;

    const messageIndex = currentSession.messages.findIndex(
      (msg) => msg.id === messageId,
    );
    if (messageIndex === -1) return;

    const message = currentSession.messages[messageIndex];

    // Only allow editing user messages
    if (message.role !== "user") return;

    // Set the input value to the message content for editing
    setInputValue(message.content);

    // Remove this message and all messages after it (like recall)
    const updatedMessages = currentSession.messages.slice(0, messageIndex);
    const updatedSession = {
      ...currentSession,
      messages: updatedMessages,
      updatedAt: new Date(),
    };

    setCurrentSession(updatedSession);

    // Update in chat history
    setChatHistory((prev) =>
      prev.map((session) =>
        session.id === currentSession.id ? updatedSession : session,
      ),
    );

    // Focus the input for immediate editing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-30 animate-in fade-in duration-300"
        style={{
          zIndex: 999,
          maxWidth: "100%", // Stay within parent container
          maxHeight: "100%", // Stay within parent container
        }}
        onClick={handleClose}
      />

      {/* Right drawer contained within app bounds */}
      <div
        className="absolute top-0 right-0 bottom-0 w-5/6 bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        style={{
          zIndex: 1000,
          maxWidth: "calc(100% - 20px)", // Ensure it stays within bounds
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h1 className="text-lg font-semibold text-gray-900">AI Composer</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewChat}
              className="text-sm"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowHistory(!showHistory);
                setShowTemplates(false);
              }}
              className="text-sm"
              title="Chat History"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowTemplates(!showTemplates);
                setShowHistory(false);
              }}
              className="text-sm"
              title="Prompt Templates"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Chat History Drawer */}
        {showHistory && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 z-10 max-h-64 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Chat History</h3>
              {chatHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">No chat history yet</p>
              ) : (
                <div className="space-y-2">
                  {chatHistory.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer"
                      onClick={() => loadChatSession(session)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {session.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {session.messages.length} messages •{" "}
                          {session.updatedAt.toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatSession(session.id);
                        }}
                        className="ml-2 p-1"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prompt Templates Modal - Obsidian Style */}
        {showTemplates && (
          <>
            {/* Modal Backdrop */}
            <div
              className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={() => setShowTemplates(false)}
            >
              {/* Modal Content */}
              <div
                className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    Prompt Templates
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplates(false)}
                    className="p-1 h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Modal Body */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                  {/* Add Template Button */}
                  <div className="mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreatingTemplate(true)}
                      className="text-sm px-3 py-1.5 h-auto w-full"
                    >
                      Add Prompt Template
                    </Button>
                  </div>

                  {/* How to use section - more compact */}
                  <div className="mb-4 p-3 bg-gray-50 border-l-4 border-blue-500 rounded-r-md">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      <span className="font-medium text-gray-800">
                        How to use:
                      </span>{" "}
                      Create templates with reusable content that you can
                      quickly insert into your chat. Type{" "}
                      <code className="mx-1 px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">
                        /template-name
                      </code>{" "}
                      in the chat input to trigger template insertion.
                    </p>
                  </div>

                  {/* Create template form */}
                  {isCreatingTemplate && (
                    <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            placeholder="Template name..."
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Content
                          </label>
                          <textarea
                            placeholder="Template content..."
                            value={templateContent}
                            onChange={(e) => setTemplateContent(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-md h-20 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button
                          size="sm"
                          onClick={createTemplate}
                          className="px-3 py-1.5 h-auto text-xs"
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsCreatingTemplate(false);
                            setTemplateName("");
                            setTemplateContent("");
                          }}
                          className="px-3 py-1.5 h-auto text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Saved Templates section */}
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <span>Saved Templates</span>
                      {promptTemplates.length > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {promptTemplates.length}
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Templates List */}
                  <div className="space-y-2">
                    {promptTemplates.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                          <svg
                            className="w-12 h-12 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm">
                          No templates found
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          Click "Add Prompt Template" to create your first
                          template
                        </p>
                      </div>
                    ) : (
                      promptTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="group p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer bg-white"
                          onClick={() => {
                            useTemplate(template);
                            setShowTemplates(false);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm text-gray-900 truncate">
                                  {template.name}
                                </h4>
                                <span className="text-xs text-gray-400">
                                  /
                                  {template.name
                                    .toLowerCase()
                                    .replace(/\s+/g, "-")}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                {template.content}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-400">
                                  {template.createdAt.toLocaleDateString()}
                                </span>
                                <div className="flex-1"></div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTemplate(template.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 h-6 w-6 text-gray-400 hover:text-red-500 transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-16 h-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Welcome to AI Composer
              </h2>
              <p className="text-gray-500 mb-6 max-w-sm">
                Start a conversation with AI to generate content, get help, or
                brainstorm ideas.
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <p>💡 Use prompt templates to get started quickly</p>
                <p>📚 Your chat history is automatically saved</p>
                <p>📄 Export conversations as text files</p>
              </div>
            </div>
          ) : (
            currentSession.messages.map((message) => {
              // Default to preview mode for AI assistant messages, formatted for others
              const defaultMode =
                message.role === "assistant" && !isSystemContextMessage(message)
                  ? "preview"
                  : "formatted";
              const viewMode = messageViewMode[message.id] || defaultMode;
              const isRawMode = viewMode === "raw";
              const isPreviewMode = viewMode === "preview";
              const isSystemMessage = isSystemContextMessage(message);
              const isCollapsed = collapsedMessages.has(message.id);

              return (
                <div
                  key={message.id}
                  className={`border rounded-lg overflow-hidden shadow-sm ${
                    isSystemMessage
                      ? "border-orange-200 bg-orange-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {/* Message Window Header */}
                  <div
                    className={`flex items-center justify-between px-4 py-2 border-b ${
                      isSystemMessage
                        ? "border-orange-200 bg-orange-100"
                        : message.role === "user"
                          ? "border-gray-200 bg-blue-50"
                          : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isSystemMessage
                            ? "bg-orange-500"
                            : message.role === "user"
                              ? "bg-blue-500"
                              : "bg-purple-500"
                        }`}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {isSystemMessage
                          ? "System"
                          : message.role === "user"
                            ? "You"
                            : "AI Assistant"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {isSystemMessage && (
                        <span className="text-xs text-orange-600 bg-orange-200 px-2 py-0.5 rounded">
                          Context
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1">
                      {isSystemMessage ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMessageCollapse(message.id)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                          title={
                            isCollapsed ? "Expand message" : "Collapse message"
                          }
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          )}
                        </Button>
                      ) : null}
                      {message.role === "user" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resumeFromMessage(message.id)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                          title="Edit and resume from this message"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMessageView(message.id)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                          title={
                            viewMode === "formatted"
                              ? "Switch to preview mode"
                              : viewMode === "preview"
                                ? "Switch to raw mode"
                                : "Switch to formatted mode"
                          }
                        >
                          {viewMode === "formatted" ? (
                            <span className="text-xs font-bold">P</span>
                          ) : viewMode === "preview" ? (
                            <span className="text-xs font-bold">R</span>
                          ) : (
                            <span className="text-xs font-bold">F</span>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.content, message.id)}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                        title="Copy message"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => recallMessage(message.id)}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                        title="Recall message"
                      >
                        <Undo2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="p-4">
                    {isSystemMessage && isCollapsed ? (
                      // Collapsed view for system messages
                      <div
                        className="text-sm text-gray-600 italic cursor-pointer hover:text-gray-800 transition-colors"
                        onClick={() => toggleMessageCollapse(message.id)}
                      >
                        {getSystemMessageSummary(message)}
                        <span className="ml-2 text-xs text-gray-400">
                          Click to expand
                        </span>
                      </div>
                    ) : (
                      // Full content view
                      <>
                        {isRawMode ? (
                          <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 bg-gray-50 p-3 rounded border">
                            {message.content}
                          </pre>
                        ) : isPreviewMode ? (
                          <div className="preview-mode">
                            {message.role === "assistant" &&
                            typingMessageId === message.id ? (
                              <TypingEffect
                                text={message.content}
                                speed={8}
                                onComplete={() => setTypingMessageId(null)}
                                className="text-sm leading-relaxed text-gray-800"
                              />
                            ) : (
                              <PreviewRenderer
                                content={message.content}
                                className={
                                  isSystemMessage
                                    ? "text-gray-700"
                                    : "text-gray-800"
                                }
                              />
                            )}
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none">
                            {message.role === "assistant" &&
                            typingMessageId === message.id ? (
                              <TypingEffect
                                text={message.content}
                                speed={8}
                                onComplete={() => setTypingMessageId(null)}
                                className="text-sm leading-relaxed text-gray-800"
                              />
                            ) : (
                              <div
                                className={`whitespace-pre-wrap text-sm leading-relaxed ${
                                  isSystemMessage
                                    ? "text-gray-700"
                                    : "text-gray-800"
                                }`}
                              >
                                {message.content}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            {/* Top toolbar with context button */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="relative context-selector-container">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowContextSelector(!showContextSelector)}
                    className="h-7 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xs"
                    title="Add Context"
                  >
                    <AtSign className="w-4 h-4 mr-1" />
                    Add Context
                  </Button>

                  {/* Context Selector Dropdown */}
                  {showContextSelector && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-3 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900">
                          Add Context
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Select documents to include in your prompt
                        </div>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {documents.map((doc) => {
                          const isSelected = selectedContextDocuments.some(
                            (d) => d.id === doc.id,
                          );
                          return (
                            <button
                              key={doc.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedContextDocuments((prev) =>
                                    prev.filter((d) => d.id !== doc.id),
                                  );
                                } else {
                                  setSelectedContextDocuments((prev) => [
                                    ...prev,
                                    doc,
                                  ]);
                                }
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                isSelected
                                  ? "bg-blue-50 text-blue-800"
                                  : "text-gray-700"
                              }`}
                            >
                              <FileText className="w-4 h-4 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-medium">
                                  {doc.title}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {doc.content.substring(0, 50)}...
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-blue-600" />
                              )}
                            </button>
                          );
                        })}
                        {documents.length === 0 && (
                          <div className="p-3 text-sm text-gray-500 text-center">
                            No documents available
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {selectedContextDocuments.length > 0 && (
                <div className="text-xs text-gray-500">
                  {selectedContextDocuments.length} document(s) selected
                </div>
              )}
            </div>

            {/* Context indicator */}
            {selectedContextDocuments.length > 0 && (
              <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100">
                {selectedContextDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                  >
                    <FileText className="w-3 h-3" />
                    <span>{doc.title}</span>
                    <button
                      onClick={() =>
                        setSelectedContextDocuments((prev) =>
                          prev.filter((d) => d.id !== doc.id),
                        )
                      }
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 p-4">
              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                className="flex-1 border-0 bg-transparent resize-none focus:outline-none text-sm placeholder-gray-400 min-h-[1.5rem]"
                rows={3}
                disabled={isLoading}
              />

              {/* Send Button */}
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg h-8 w-8 p-0 shadow-sm transition-colors flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
