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
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import SettingsModal, { AppSettings } from "./SettingsModal";
import { getLLMService } from "../services/llmService";
import { useQuiz } from "../contexts/QuizContext";
import HybridEditor from "./HybridEditor";

interface Document {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
}

interface CollisionNotification {
  show: boolean;
  message: string;
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
    content: `The ancient ruins attest to the skill of the builders. [to provide or serve as clear evidence of]

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
  const { createQuiz, getQuizzesByDocument, updateQuiz } = useQuiz();
  const [draggedQuiz, setDraggedQuiz] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [currentPreviewQuiz, setCurrentPreviewQuiz] = useState<any>(null);
  const [collisionNotification, setCollisionNotification] =
    useState<CollisionNotification>({ show: false, message: "" });
  const [tempTitle, setTempTitle] = useState("");
  const [revealedRegions, setRevealedRegions] = useState<Set<string>>(
    new Set(),
  );
  const [manuallyRevealedRegions, setManuallyRevealedRegions] = useState<
    Set<string>
  >(new Set());
  const editorRef = useRef<HTMLDivElement>(null);

  const selectedDocument = documents.find(
    (doc) => doc.id === selectedDocumentId,
  );
  const documentQuizzes = selectedDocument
    ? getQuizzesByDocument(selectedDocument.id)
    : [];

  // Check for name collision
  const checkNameCollision = (
    newName: string,
    currentDocId: string,
  ): boolean => {
    return documents.some(
      (doc) =>
        doc.id !== currentDocId &&
        doc.name.toLowerCase() === newName.toLowerCase(),
    );
  };

  // Show collision notification (persistent during editing)
  const showCollisionNotification = (message: string) => {
    setCollisionNotification({ show: true, message });
  };

  // Handle title change during typing with real-time collision detection
  const handleTitleChange = (newTitle: string) => {
    if (!selectedDocument) return;

    setTempTitle(newTitle);

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      // Hide collision notification if field is empty
      setCollisionNotification({ show: false, message: "" });
      return;
    }

    // Check for collision during typing and show warning immediately
    if (checkNameCollision(trimmedTitle, selectedDocument.id)) {
      showCollisionNotification(
        `A document with the name "${trimmedTitle}" already exists. Please choose a different name.`,
      );
      return;
    } else {
      // Hide collision notification if no collision
      setCollisionNotification({ show: false, message: "" });
    }
  };

  // Handle saving the title on blur
  const handleTitleSave = () => {
    if (!selectedDocument) return;

    const trimmedTitle = tempTitle.trim();
    if (!trimmedTitle) {
      setTempTitle(selectedDocument.name); // Reset to original name if empty
      return;
    }

    if (checkNameCollision(trimmedTitle, selectedDocument.id)) {
      setTempTitle(selectedDocument.name); // Reset to original name on collision
      return;
    }

    // Update the document name
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === selectedDocument.id ? { ...doc, name: trimmedTitle } : doc,
      ),
    );
  };

  // Initialize temp title when document changes
  useEffect(() => {
    if (selectedDocument) {
      setTempTitle(selectedDocument.name);
      // Clear any existing collision notification when switching documents
      setCollisionNotification({ show: false, message: "" });
      // Clear revealed regions and selection when switching documents
      setRevealedRegions(new Set());
      setManuallyRevealedRegions(new Set());
      setSelectedText("");
    }
  }, [selectedDocument?.id]);

  const handleQuizToolClick = async (toolId: string) => {
    if (!selectedText) {
      alert("Please select some text first to generate a quiz!");
      return;
    }

    if (!settings.llm.apiKey) {
      alert("Please configure your LLM API key in settings first!");
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
            `Flashcards - ${selectedDocument!.name}`,
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
            `Multiple Choice - ${selectedDocument!.name}`,
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
            `Writing Tasks - ${selectedDocument!.name}`,
            selectedText,
            tasks,
            selectedDocument!.id,
          );
          navigate("/quiz/short-writing");
          break;
        }
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      alert(
        `Failed to generate quiz: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsGeneratingQuiz(false);
      setGeneratingType("");
    }
  };

  // Advanced markdown parsing to identify formatted regions
  const parseMarkdownRegions = (content: string) => {
    const regions: Array<{
      id: string;
      type: "bold" | "highlight" | "bracket";
      start: number;
      end: number;
      rawText: string;
      formattedText: string;
    }> = [];

    let regionId = 0;

    // Find bold regions **text**
    content.replace(/\*\*(.*?)\*\*/g, (match, group, offset) => {
      regions.push({
        id: `bold-${regionId++}`,
        type: "bold",
        start: offset,
        end: offset + match.length,
        rawText: match,
        formattedText: group,
      });
      return match;
    });

    // Find highlight regions ==text==
    content.replace(/==(.*?)==/g, (match, group, offset) => {
      regions.push({
        id: `highlight-${regionId++}`,
        type: "highlight",
        start: offset,
        end: offset + match.length,
        rawText: match,
        formattedText: group,
      });
      return match;
    });

    // Find bracket regions [text]
    content.replace(/\[([^\]]+)\]/g, (match, group, offset) => {
      regions.push({
        id: `bracket-${regionId++}`,
        type: "bracket",
        start: offset,
        end: offset + match.length,
        rawText: match,
        formattedText: group,
      });
      return match;
    });

    return regions.sort((a, b) => a.start - b.start);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const selectedText = selection.toString();
      const content = selectedDocument?.content || "";

      setSelectedText(selectedText);

      // Find all regions that contain the selected text
      const regions = parseMarkdownRegions(content);
      const newRevealedRegions = new Set<string>();

      // Simple approach: if the selected text overlaps with a region's formatted text or raw text
      regions.forEach((region) => {
        if (
          selectedText.includes(region.formattedText) ||
          selectedText.includes(region.rawText) ||
          region.formattedText.includes(selectedText) ||
          region.rawText.includes(selectedText)
        ) {
          newRevealedRegions.add(region.id);
        }
      });

      setRevealedRegions(newRevealedRegions);
    } else {
      // When selection is cleared, clear everything to return to formatted state
      setSelectedText("");
      setRevealedRegions(new Set());
    }
  };

  // Function to handle clicks on specific formatted regions
  const handleRegionClick = (regionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Toggle manual reveal for this specific region
    const newManuallyRevealedRegions = new Set(manuallyRevealedRegions);
    if (newManuallyRevealedRegions.has(regionId)) {
      newManuallyRevealedRegions.delete(regionId);
    } else {
      newManuallyRevealedRegions.add(regionId);
    }
    setManuallyRevealedRegions(newManuallyRevealedRegions);
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
      alert("You must have at least one document.");
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
    setRevealedRegions(new Set());
    setManuallyRevealedRegions(new Set());
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

  // Advanced rendering with mixed raw/formatted content
  const renderAdvancedMarkdownContent = (content: string) => {
    const lines = content.split("\n");

    return lines.map((line, lineIndex) => {
      // Handle headers first
      if (line.startsWith("# ")) {
        return (
          <h1 key={lineIndex} className="text-2xl font-bold mb-4 mt-6">
            {line.substring(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={lineIndex} className="text-xl font-semibold mb-3 mt-5">
            {line.substring(3)}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={lineIndex} className="text-lg font-semibold mb-2 mt-4">
            {line.substring(4)}
          </h3>
        );
      }
      if (line.trim() === "") {
        return <div key={lineIndex} className="mb-2"></div>;
      }

      // Calculate line start position in full content
      const lineStart =
        lines.slice(0, lineIndex).join("\n").length + (lineIndex > 0 ? 1 : 0);
      const lineEnd = lineStart + line.length;

      // Get regions that affect this line
      const regions = parseMarkdownRegions(content);
      const lineRegions = regions.filter(
        (region) =>
          (region.start >= lineStart && region.start < lineEnd) ||
          (region.end > lineStart && region.end <= lineEnd) ||
          (region.start < lineStart && region.end > lineEnd),
      );

      if (lineRegions.length === 0) {
        // No formatting in this line
        return (
          <p key={lineIndex} className="mb-3 leading-relaxed">
            {line}
          </p>
        );
      }

      // Sort regions by start position within the line
      const sortedLineRegions = lineRegions
        .map((region) => ({
          ...region,
          startInLine: Math.max(0, region.start - lineStart),
          endInLine: Math.min(line.length, region.end - lineStart),
        }))
        .sort((a, b) => a.startInLine - b.startInLine);

      // Build mixed content with revealed/hidden regions
      const elements: JSX.Element[] = [];
      let lastPos = 0;

      sortedLineRegions.forEach((region, regionIndex) => {
        // Add text before region
        if (region.startInLine > lastPos) {
          const beforeText = line.substring(lastPos, region.startInLine);
          elements.push(
            <span key={`before-${regionIndex}`}>{beforeText}</span>,
          );
        }

        // Skip if this region overlaps with previous one
        if (region.startInLine < lastPos) {
          return;
        }

        // Add region content (raw or formatted)
        const regionText = line.substring(region.startInLine, region.endInLine);
        const isRevealed =
          manuallyRevealedRegions.has(region.id) ||
          revealedRegions.has(region.id);

        if (isRevealed) {
          // Show raw markdown
          elements.push(
            <span
              key={`region-${region.id}`}
              className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm border cursor-pointer hover:bg-gray-200"
              onClick={(e) => handleRegionClick(region.id, e)}
            >
              {region.rawText}
            </span>,
          );
        } else {
          // Show formatted content with click handlers
          const formattedText = region.formattedText;
          if (region.type === "bold") {
            elements.push(
              <strong
                key={`region-${region.id}`}
                className="cursor-pointer hover:bg-gray-100 px-1 rounded"
                onClick={(e) => handleRegionClick(region.id, e)}
              >
                {formattedText}
              </strong>,
            );
          } else if (region.type === "highlight") {
            elements.push(
              <span
                key={`region-${region.id}`}
                className="bg-yellow-200 px-1 py-0.5 rounded cursor-pointer hover:bg-yellow-300"
                onClick={(e) => handleRegionClick(region.id, e)}
              >
                {formattedText}
              </span>,
            );
          } else if (region.type === "bracket") {
            elements.push(
              <span
                key={`region-${region.id}`}
                className="text-purple-600 bg-gray-100 px-1 py-0.5 rounded text-sm cursor-pointer hover:bg-gray-200"
                onClick={(e) => handleRegionClick(region.id, e)}
              >
                [{formattedText}]
              </span>,
            );
          }
        }

        lastPos = region.endInLine;
      });

      // Add remaining text after last region
      if (lastPos < line.length) {
        const afterText = line.substring(lastPos);
        elements.push(<span key="after">{afterText}</span>);
      }

      return (
        <p key={lineIndex} className="mb-3 leading-relaxed">
          {elements}
        </p>
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
                  <span className="text-sm truncate">{doc.name}</span>
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
                ? selectedDocument.name
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

        <div className="flex-1 overflow-y-auto">
          <div className="w-[800px] mx-auto relative">
            {selectedDocument ? (
              <div>
                {/* Title Section */}
                <div className="p-6 pb-3">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onBlur={() => handleTitleSave()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    className="text-2xl font-bold w-full border-none outline-none bg-transparent hover:bg-gray-50 focus:bg-white px-2 py-1 rounded transition-colors"
                    placeholder="Document Title"
                  />
                </div>

                {/* Content Section */}
                <div className="p-6 pt-3">
                  {showPreview ? (
                    <HybridEditor
                      content={previewContent}
                      onChange={setPreviewContent}
                      className="border-2 border-orange-200 rounded-lg"
                      onTextSelection={(text) => {
                        setSelectedText(text);
                        handleTextSelection();
                      }}
                    />
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "copy";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedQuiz) {
                          setOriginalContent(selectedDocument.content);
                          setPreviewContent(draggedQuiz.sourceText || "No preview content available");
                          setShowPreview(true);
                        }
                      }}
                    >
                      <HybridEditor
                        content={selectedDocument.content}
                        onChange={handleContentChange}
                        onTextSelection={(text) => {
                          setSelectedText(text);
                          handleTextSelection();
                        }}
                        className="min-h-[600px]"
                      />
                    </div>
                  )}
                </div>
              </div>
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
                  }}
                >
                  Return to Document
                </Button>
              </div>
            ) : selectedText ? (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="font-medium text-blue-800 mb-1">
                  Selected text:
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
                          {quiz.createdAt.toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
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

      {/* Collision Notification */}
      {collisionNotification.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 min-w-64 max-w-md">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              {collisionNotification.message}
            </span>
          </div>
        </div>
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
