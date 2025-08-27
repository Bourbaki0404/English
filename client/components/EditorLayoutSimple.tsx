import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Menu,
  X,
  Settings,
  Loader2,
  GripVertical,
} from "lucide-react";
import { Button } from "./ui/button";
import SettingsModal, { AppSettings } from "./SettingsModal";
import { getLLMService } from "../services/llmService";
import { useQuiz } from "../contexts/QuizContext";
import { ErrorHandler } from "@/lib/error-handler";
import { formatQuizDate } from "@/lib/date-utils";

interface Document {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
}

const initialDocuments: Document[] = [
  {
    id: "1",
    name: "English 2",
    content: "Welcome to English 2! Start writing your notes here...",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "English 3",
    content: "Welcome to English 3! This is your study space.",
    createdAt: new Date("2024-01-16"),
  },
  {
    id: "3",
    name: "English 4",
    content: `# English 4

The ancient ruins attest to the skill of the builders. [to provide or serve as clear evidence of]

I can attest to his honesty; he is a very trustworthy person. [to declare that something exists or is true, especially formally or as an official witness]

He lived an ascetic life, renouncing worldly pleasures and dedicating himself to spiritual discipline. [characterized by severe self-discipline and avoidance of all forms of indulgence, typically for religious reasons]

The team made an **inadvertent** error, realizing their mistake immediately after submitting the report. [deliberate; intentional]

She had a natural **propensity** for art, easily sketching intricate designs from a young age. [an inclination or natural tendency to behave in a particular way]

The **primeval** forest felt untouched by time, with ancient trees standing in peaceful solitude.`,
    createdAt: new Date("2024-01-17"),
  },
];

export default function EditorLayoutSimple() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("3");
  const [selectedText, setSelectedText] = useState("");
  const [selectedDisplayText, setSelectedDisplayText] = useState("");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generatingType, setGeneratingType] = useState<string>("");
  const [settings, setSettings] = useState<AppSettings>({
    general: {
      languageLevel: "cet4",
    },
    llm: {
      apiKey: "AIzaSyCNDJgpRcdDiEVSNomjIMTW1yNWjX7K6P0",
      provider: "gemini",
      model: "gemini-2.0-flash-exp",
    },
  });
  const { createQuiz, getQuizzesByDocument, setCurrentDocumentId } = useQuiz();
  const [draggedQuiz, setDraggedQuiz] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isEditingContent, setIsEditingContent] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const selectedDocument = documents.find(
    (doc) => doc.id === selectedDocumentId,
  );
  const documentQuizzes = selectedDocument
    ? getQuizzesByDocument(selectedDocument.id)
    : [];

  // Function to extract title from markdown content
  const extractTitleFromContent = (content: string): string => {
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return trimmed.substring(2).trim();
      }
    }
    return "";
  };

  // Function to get display name for document
  const getDocumentDisplayName = (doc: Document): string => {
    const titleFromContent = extractTitleFromContent(doc.content);
    return titleFromContent || doc.name;
  };

  // Update document name when content changes
  useEffect(() => {
    if (selectedDocument) {
      const titleFromContent = extractTitleFromContent(
        selectedDocument.content,
      );
      if (titleFromContent && titleFromContent !== selectedDocument.name) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === selectedDocument.id
              ? { ...doc, name: titleFromContent }
              : doc,
          ),
        );
      }
    }
  }, [selectedDocument?.content]);

  const handleQuizToolClick = async (toolId: string) => {
    if (!selectedText) {
      ErrorHandler.showWarning(
        "No Text Selected",
        "Please select some text first to generate a quiz!",
      );
      return;
    }

    if (!settings.llm.apiKey) {
      ErrorHandler.showWarning(
        "API Key Required",
        "Please configure your LLM API key in settings first!",
      );
      setSettingsOpen(true);
      return;
    }

    setIsGeneratingQuiz(true);
    setGeneratingType(toolId);

    try {
      const llmService = getLLMService(settings);

      switch (toolId) {
        case "flashcard": {
          const flashcards = await llmService.generateFlashCards(selectedText);
          createQuiz(
            "flashcard",
            `Flashcards - ${getDocumentDisplayName(selectedDocument!)}`,
            selectedText,
            flashcards,
            selectedDocument!.id,
          );
          navigate("/quiz/flashcard");
          break;
        }
        case "multiple-choice": {
          const questions =
            await llmService.generateMultipleChoice(selectedText);
          createQuiz(
            "multiple-choice",
            `Multiple Choice - ${getDocumentDisplayName(selectedDocument!)}`,
            selectedText,
            questions,
            selectedDocument!.id,
          );
          navigate("/quiz/multiple-choice");
          break;
        }
        case "short-writing": {
          const tasks = await llmService.generateWritingTasks(selectedText);
          createQuiz(
            "short-writing",
            `Writing Tasks - ${getDocumentDisplayName(selectedDocument!)}`,
            selectedText,
            tasks,
            selectedDocument!.id,
          );
          navigate("/quiz/short-writing");
          break;
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, "Quiz Generation");
    } finally {
      setIsGeneratingQuiz(false);
      setGeneratingType("");
    }
  };

  // Helper function to find original markdown text from rendered selection
  const findOriginalTextFromSelection = (
    selectedRenderedText: string,
    originalContent: string,
  ): string => {
    if (!selectedRenderedText.trim()) return selectedRenderedText;

    // Clean the selected text (remove extra whitespace, normalize)
    const cleanSelected = selectedRenderedText.trim().replace(/\s+/g, " ");

    // Try to find the exact text in original content first
    if (originalContent.includes(cleanSelected)) {
      return cleanSelected;
    }

    // Look for text that would render to the selected text
    // Split original content into lines and check each
    const lines = originalContent.split("\n");
    let bestMatch = selectedRenderedText;
    let bestMatchScore = 0;

    for (const line of lines) {
      // Remove markdown formatting for comparison
      const cleanLine = line
        .replace(/^#+\s+/, "") // Remove headers
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.*?)\*/g, "$1") // Remove italic
        .replace(/`(.*?)`/g, "$1") // Remove inline code
        .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Remove links, keep text
        .trim();

      // Check if this line contains our selected text
      if (cleanLine.includes(cleanSelected)) {
        // Find the best matching segment in the original line
        const selectedWords = cleanSelected.split(" ");
        let startIndex = -1;
        let endIndex = -1;

        // Try to find the span of text in the original line
        for (let i = 0; i < selectedWords.length; i++) {
          const wordIndex = line
            .toLowerCase()
            .indexOf(selectedWords[i].toLowerCase());
          if (wordIndex !== -1) {
            if (startIndex === -1) startIndex = wordIndex;
            // Find the end of the last word
            const lastWordIndex = line
              .toLowerCase()
              .lastIndexOf(
                selectedWords[selectedWords.length - 1].toLowerCase(),
              );
            if (lastWordIndex !== -1) {
              endIndex =
                lastWordIndex + selectedWords[selectedWords.length - 1].length;
            }
          }
        }

        if (startIndex !== -1 && endIndex !== -1) {
          const originalSegment = line.substring(startIndex, endIndex);
          const score = originalSegment.length / selectedRenderedText.length;
          if (score > bestMatchScore) {
            bestMatch = originalSegment;
            bestMatchScore = score;
          }
        }
      }
    }

    return bestMatch;
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const selectedRenderedText = selection.toString();

      // Always store the rendered text for display
      setSelectedDisplayText(selectedRenderedText);

      // If we're in preview mode, try to map back to original markdown
      if (showPreview && previewContent) {
        const originalText = findOriginalTextFromSelection(
          selectedRenderedText,
          previewContent,
        );
        setSelectedText(originalText);
      } else {
        // Normal mode - use the selected text as-is
        setSelectedText(selectedRenderedText);
      }
    }
    // Note: Don't clear selectedText here, let user see the raw formatting
  };

  const handleDoubleClick = () => {
    if (!showPreview) {
      setIsEditingContent(true);
      setSelectedText(""); // Clear selection when entering edit mode
      setSelectedDisplayText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsEditingContent(false);
    }
  };

  const handleEditingBlur = () => {
    setIsEditingContent(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Clear selection when clicking (but not when selecting text)
    if (!window.getSelection()?.toString()) {
      setSelectedText("");
      setSelectedDisplayText("");
    }
  };

  const handleAddDocument = () => {
    const newId = (
      Math.max(...documents.map((d) => parseInt(d.id))) + 1
    ).toString();
    const newDocument: Document = {
      id: newId,
      name: "New Document",
      content: "# New Document\n\nStart writing your content here...",
      createdAt: new Date(),
    };

    setDocuments((prev) => [...prev, newDocument]);
    setSelectedDocumentId(newId);
  };

  const handleDeleteDocument = (docId: string) => {
    if (documents.length <= 1) {
      ErrorHandler.showWarning(
        "Cannot Delete Document",
        "You must have at least one document.",
      );
      return;
    }

    if (confirm("Are you sure you want to delete this document?")) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));

      if (selectedDocumentId === docId) {
        const remainingDocs = documents.filter((doc) => doc.id !== docId);
        setSelectedDocumentId(remainingDocs[0]?.id || "");
      }
    }
  };

  const handleDocumentSelect = (docId: string) => {
    setSelectedDocumentId(docId);
    setSelectedText("");
    setSelectedDisplayText("");
  };

  const handleContentChange = (newContent: string) => {
    if (selectedDocument) {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === selectedDocument.id
            ? { ...doc, content: newContent }
            : doc,
        ),
      );
    }
  };

  const renderSelectiveMarkdownContent = (
    content: string,
    selectedText: string | null,
  ) => {
    if (!selectedText) {
      // No selection, render normally
      return renderMarkdownContent(content);
    }

    // For simplicity, just highlight the selected text when it appears
    return content.split("\n").map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={index} className="text-2xl font-bold mb-4 mt-6">
            {line.substring(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={index} className="text-xl font-semibold mb-3 mt-5">
            {line.substring(3)}
          </h2>
        );
      }
      if (line.trim() === "") {
        return <div key={index} className="mb-2"></div>;
      }

      // Check if this line contains the selected text
      const containsSelection = line.includes(selectedText);

      if (containsSelection) {
        // Show raw markdown for lines containing selection
        return (
          <p
            key={index}
            className="mb-3 leading-relaxed bg-blue-50 border border-blue-200 px-2 py-1 rounded font-mono text-sm"
          >
            {line}
          </p>
        );
      }

      // Handle markdown-style formatting for non-selected lines
      const processedLine = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(
          /==(.*?)==/g,
          '<span class="bg-yellow-200 px-1 py-0.5 rounded">$1</span>',
        )
        .replace(
          /\[([^\]]+)\]/g,
          '<span class="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm">[$1]</span>',
        );

      return (
        <p
          key={index}
          className="mb-3 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    });
  };

  const renderMarkdownContent = (content: string) => {
    return content.split("\n").map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={index} className="text-2xl font-bold mb-4 mt-6">
            {line.substring(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={index} className="text-xl font-semibold mb-3 mt-5">
            {line.substring(3)}
          </h2>
        );
      }
      if (line.trim() === "") {
        return <div key={index} className="mb-2"></div>;
      }

      // Handle markdown-style formatting
      const processedLine = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(
          /==(.*?)==/g,
          '<span class="bg-yellow-200 px-1 py-0.5 rounded">$1</span>',
        )
        .replace(
          /\[([^\]]+)\]/g,
          '<span class="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm">[$1]</span>',
        );

      return (
        <p
          key={index}
          className="mb-3 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    });
  };

  return (
    <div className="h-screen flex bg-white">
      {/* Left Sidebar - Document Navigation */}
      <div
        className={`transition-all duration-300 border-r border-gray-200 bg-gray-50 ${
          leftSidebarOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Documents</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddDocument}
              title="Add new document"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-2 overflow-y-auto max-h-full">
          <div className="space-y-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`group flex items-center justify-between py-2 px-3 rounded cursor-pointer transition-colors ${
                  selectedDocumentId === doc.id
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => handleDocumentSelect(doc.id)}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <FileText
                    className={`w-4 h-4 mr-2 flex-shrink-0 ${
                      selectedDocumentId === doc.id
                        ? "text-blue-500"
                        : "text-gray-500"
                    }`}
                  />
                  <span className="text-sm truncate">
                    {getDocumentDisplayName(doc)}
                  </span>
                </div>
                {documents.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id);
                    }}
                    title="Delete document"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Left Sidebar Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 left-2 z-10"
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
      >
        {leftSidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <Menu className="w-4 h-4" />
        )}
      </Button>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {selectedDocument
                ? getDocumentDisplayName(selectedDocument)
                : "No document selected"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <span className="text-sm">Share</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto relative">
            {selectedDocument ? (
              isEditingContent && !showPreview ? (
                <textarea
                  value={selectedDocument.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleEditingBlur}
                  className="w-full min-h-[600px] p-4 border-0 resize-none focus:outline-none bg-transparent"
                  style={{
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    lineHeight: "1.6",
                    fontSize: "16px",
                  }}
                  placeholder="Start writing your document content here..."
                  autoFocus
                />
              ) : (
                <div
                  className="prose prose-lg max-w-none cursor-text hover:bg-gray-50 rounded p-2 transition-colors"
                  style={{
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    lineHeight: "1.6",
                    fontSize: "16px",
                  }}
                  onMouseUp={handleTextSelection}
                  onDoubleClick={!showPreview ? handleDoubleClick : undefined}
                  onClick={!showPreview ? handleClick : undefined}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedQuiz) {
                      setOriginalContent(selectedDocument.content);
                      setPreviewContent(draggedQuiz.sourceText);
                      setShowPreview(true);
                      // Stay in preview mode to show rendered markdown
                    }
                  }}
                >
                  {showPreview
                    ? renderMarkdownContent(previewContent)
                    : renderSelectiveMarkdownContent(
                        selectedDocument.content,
                        selectedText || null,
                      )}
                  {!showPreview && !isEditingContent && (
                    <div className="absolute bottom-4 right-4 text-xs text-gray-400 opacity-50 pointer-events-none">
                      Double-click to edit
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    Select a document to start editing
                  </p>
                  <Button onClick={handleAddDocument}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Document
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Quiz Tools */}
      <div
        className={`transition-all duration-300 border-l border-gray-200 bg-white ${
          rightSidebarOpen ? "w-80" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Quiz Tools</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            {showPreview ? (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="font-medium text-orange-800 mb-2">
                  Viewing Originally Selected Text
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewContent("");
                    setOriginalContent("");
                    setIsEditingContent(false);
                  }}
                >
                  Return to Document
                </Button>
              </div>
            ) : selectedText ? (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="font-medium text-blue-800 mb-1">
                  Selected text (original markdown):
                </div>
                <div className="text-blue-700 text-xs">
                  "{selectedText.substring(0, 50)}
                  {selectedText.length > 50 ? "..." : '"'}
                </div>
              </div>
            ) : (
              "Select text in the editor to generate quizzes"
            )}
          </div>

          <div
            className={`p-4 rounded-lg border-2 border-blue-200 bg-blue-50 cursor-pointer hover:shadow-md transition-all ${
              isGeneratingQuiz && generatingType === "flashcard"
                ? "opacity-50 pointer-events-none"
                : ""
            }`}
            onClick={() => handleQuizToolClick("flashcard")}
          >
            <div className="flex items-start space-x-3">
              {isGeneratingQuiz && generatingType === "flashcard" ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mt-1" />
              ) : (
                <span className="text-2xl">🎴</span>
              )}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  {isGeneratingQuiz && generatingType === "flashcard"
                    ? "Generating..."
                    : "Flash Card"}
                </h3>
                <p className="text-sm text-gray-600">
                  Create flashcards from selected text
                </p>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border-2 border-green-200 bg-green-50 cursor-pointer hover:shadow-md transition-all ${
              isGeneratingQuiz && generatingType === "multiple-choice"
                ? "opacity-50 pointer-events-none"
                : ""
            }`}
            onClick={() => handleQuizToolClick("multiple-choice")}
          >
            <div className="flex items-start space-x-3">
              {isGeneratingQuiz && generatingType === "multiple-choice" ? (
                <Loader2 className="w-6 h-6 animate-spin text-green-600 mt-1" />
              ) : (
                <span className="text-2xl">📝</span>
              )}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  {isGeneratingQuiz && generatingType === "multiple-choice"
                    ? "Generating..."
                    : "Multiple Choice"}
                </h3>
                <p className="text-sm text-gray-600">
                  Generate multiple choice questions
                </p>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border-2 border-purple-200 bg-purple-50 cursor-pointer hover:shadow-md transition-all ${
              isGeneratingQuiz && generatingType === "short-writing"
                ? "opacity-50 pointer-events-none"
                : ""
            }`}
            onClick={() => handleQuizToolClick("short-writing")}
          >
            <div className="flex items-start space-x-3">
              {isGeneratingQuiz && generatingType === "short-writing" ? (
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mt-1" />
              ) : (
                <span className="text-2xl">✍️</span>
              )}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  {isGeneratingQuiz && generatingType === "short-writing"
                    ? "Generating..."
                    : "Short Writing"}
                </h3>
                <p className="text-sm text-gray-600">
                  Create writing prompts and exercises
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Recent Quizzes</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {documentQuizzes.length > 0 ? (
              documentQuizzes.map((quiz) => {
                const getQuizIcon = (type: string) => {
                  switch (type) {
                    case "flashcard":
                      return "🎴";
                    case "multiple-choice":
                      return "📝";
                    case "short-writing":
                      return "✍️";
                    default:
                      return "📄";
                  }
                };

                const getItemCount = (quiz: any) => {
                  if (Array.isArray(quiz.data)) {
                    switch (quiz.type) {
                      case "flashcard":
                        return `${quiz.data.length} cards`;
                      case "multiple-choice":
                        return `${quiz.data.length} questions`;
                      case "short-writing":
                        return `${quiz.data.length} tasks`;
                      default:
                        return `${quiz.data.length} items`;
                    }
                  }
                  return "0 items";
                };

                return (
                  <div
                    key={quiz.id}
                    className="group p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors relative"
                    draggable
                    onDragStart={(e) => {
                      setDraggedQuiz(quiz);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onDragEnd={() => setDraggedQuiz(null)}
                    onClick={() => {
                      // Navigate to the appropriate quiz route
                      navigate(`/quiz/${quiz.type}`);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">
                            {getQuizIcon(quiz.type)}
                          </span>
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {quiz.title}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getItemCount(quiz)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatQuizDate(quiz.createdAt)}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No quizzes for this document yet.
                <br />
                Select text and generate some quizzes!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Right Sidebar Button */}
      {!rightSidebarOpen && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-2 z-10"
          onClick={() => setRightSidebarOpen(true)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}
