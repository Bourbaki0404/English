import { AppSettings } from "../components/SettingsModal";
import { ErrorHandler } from "@/lib/error-handler";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface MultipleChoiceOption {
  text: string;
  explanation: string;
}

interface MultipleChoiceQuiz {
  question: string;
  options: MultipleChoiceOption[];
  correctAnswer: number;
}

interface FlashCard {
  id: string;
  question: string;
  answer: string;
}

interface WritingTask {
  id: string;
  title: string;
  prompt: string;
  maxWords: number;
  timeLimit: number;
}

class LLMService {
  private settings: AppSettings;

  constructor(settings: AppSettings) {
    this.settings = settings;
  }

  updateSettings(settings: AppSettings) {
    this.settings = settings;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    if (!this.settings.llm.apiKey) {
      throw new Error("API key not configured");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.settings.llm.model}:generateContent?key=${this.settings.llm.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    };

    console.log("Making Gemini API request:", {
      url: apiUrl.replace(this.settings.llm.apiKey, "API_KEY_HIDDEN"),
      model: this.settings.llm.model,
      promptLength: prompt.length,
    });

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // Store response metadata immediately
      const responseStatus = response.status;
      const responseStatusText = response.statusText;
      const responseOk = response.ok;
      const responseHeaders = response.headers;

      console.log(
        "Gemini API response status:",
        responseStatus,
        responseStatusText,
      );

      // Handle response reading with proper error handling
      let data: any;
      let responseText: string = "";

      // Check if response body exists and hasn't been consumed
      if (!response.bodyUsed) {
        try {
          responseText = await response.text();
          console.log("Response text length:", responseText.length);
        } catch (readError) {
          console.error("Failed to read response body:", readError);
          // If we can't read the body, create a minimal error response
          responseText = "";
        }
      } else {
        console.warn("Response body was already consumed");
        responseText = "";
      }

      // Parse response text
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
          console.log("Successfully parsed response as JSON");
        } catch (jsonError) {
          console.log("Response is not valid JSON, treating as text");
          data = { error: responseText };
        }
      } else {
        // Fallback when no response text is available
        data = {
          error: responseOk
            ? "No content received from API"
            : `HTTP ${responseStatus}: ${responseStatusText}`,
        };
      }

      // Handle error responses
      if (!responseOk) {
        console.error("Error response data:", JSON.stringify(data, null, 2));

        let errorMessage = `HTTP ${responseStatus}: ${responseStatusText}`;

        // Extract error message from response data with better parsing
        try {
          if (data?.error?.message) {
            errorMessage = data.error.message;
          } else if (data?.error?.errors?.[0]?.message) {
            // Handle Gemini API error format
            errorMessage = data.error.errors[0].message;
          } else if (data?.error && typeof data.error === "string") {
            errorMessage = data.error;
          } else if (data?.message) {
            errorMessage = data.message;
          } else if (typeof data === "string") {
            errorMessage = data;
          } else if (data?.error && typeof data.error === "object") {
            // If error is an object, try to extract meaningful info
            errorMessage = JSON.stringify(data.error);
          }
        } catch (parseError) {
          console.warn("Error parsing error message:", parseError);
          errorMessage = `HTTP ${responseStatus}: ${responseStatusText}`;
        }

        // Handle specific HTTP status codes first
        if (responseStatus === 429) {
          throw new Error(
            "Rate limit exceeded. You've reached the API usage limit. Please wait a few minutes before trying again.",
          );
        }

        if (responseStatus === 400) {
          throw new Error(
            "Bad request. Please check your input and try again.",
          );
        }

        if (responseStatus === 401 || responseStatus === 403) {
          throw new Error(
            "Invalid API key. Please check your API key in settings and try again.",
          );
        }

        if (responseStatus === 503) {
          throw new Error(
            "Service temporarily unavailable. Please try again in a few minutes.",
          );
        }

        // Handle specific error messages
        const lowerMessage = errorMessage.toLowerCase();

        if (
          lowerMessage.includes("user location is not supported") ||
          lowerMessage.includes("location not supported")
        ) {
          throw new Error(
            "Service not available in your region. The AI service is currently not supported in your location. Consider using a VPN or contact support.",
          );
        }

        if (
          lowerMessage.includes("api key") ||
          lowerMessage.includes("unauthorized") ||
          lowerMessage.includes("forbidden")
        ) {
          throw new Error(
            "Invalid API key. Please check your API key in settings and try again.",
          );
        }

        if (
          lowerMessage.includes("quota") ||
          lowerMessage.includes("rate limit") ||
          lowerMessage.includes("too many requests")
        ) {
          throw new Error(
            "Rate limit exceeded. You've reached the API usage limit. Please wait before trying again.",
          );
        }

        throw new Error(`API Error: ${errorMessage}`);
      }

      // Handle successful response
      console.log("Gemini API successful response structure:", {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length,
        firstCandidateStructure: data.candidates?.[0]
          ? Object.keys(data.candidates[0])
          : "none",
      });

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        console.error(
          "No content in API response:",
          JSON.stringify(data, null, 2),
        );
        throw new Error("No content received from API");
      }

      console.log("Generated content length:", content.length);
      return content;
    } catch (error) {
      console.error("Gemini API call failed:", error);
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Network error: Unable to connect to Gemini API. Please check your internet connection.",
        );
      }
      throw error;
    }
  }

  private getLanguageLevelDescription(): string {
    const levelMap = {
      junior: "junior high school level",
      high: "high school level",
      cet4: "CET-4 level (intermediate)",
      cet6: "CET-6 level (upper-intermediate)",
      ielts: "IELTS level (advanced)",
      toefl: "TOEFL level (advanced)",
      sat: "SAT level (advanced)",
      advanced: "advanced/native level",
    };

    return (
      levelMap[this.settings.general.languageLevel as keyof typeof levelMap] ||
      "intermediate level"
    );
  }

  async generateMultipleChoice(
    selectedText: string,
  ): Promise<MultipleChoiceQuiz[]> {
    const languageLevel = this.getLanguageLevelDescription();

    const prompt = `Generate a multiple-choice quiz in JSON format based on the provided text, matching these TypeScript interfaces:

interface MultipleChoiceOption {
    text: string;
    explanation: string; // Explain why the option is correct (if true) or incorrect (if false)
}

interface MultipleChoiceQuiz {
    question: string;
    options: MultipleChoiceOption[]; // Exactly 4 options per question
    correctAnswer: number; // 0-based index of the correct option
}

## Requirements:
1. **Text Source**: Use ONLY the words and concepts from the provided text below. Create questions that test understanding of vocabulary, grammar, or concepts from this text.

2. **Language Level**: Adapt the difficulty and explanations for ${languageLevel} English learners.

3. **Question Structure**:
   - Create questions that test vocabulary understanding, reading comprehension, or language concepts
   - Use clear, context-rich sentences
   - Ask specific questions about word meanings, grammar, or text comprehension

4. **Options**:
   - 1 correct answer that accurately reflects the text
   - 3 plausible but incorrect options (related to the topic but not matching the specific context)

5. **Explanations**:
   - Correct option: Explain why this answer is correct based on the text
   - Incorrect options: Explain why they don't fit the context or are incorrect

6. **Format**: Return ONLY a valid JSON array of MultipleChoiceQuiz objects (no markdown formatting or additional text).

## Source Text:
${selectedText}

Generate 1-3 questions based on the complexity and length of the text.`;

    try {
      const response = await this.callGeminiAPI(prompt);

      // Clean up the response to extract JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const quizData = JSON.parse(jsonMatch[0]);
      return quizData;
    } catch (error) {
      console.error("Error generating multiple choice quiz:", error);
      throw error;
    }
  }

  async generateFlashCards(selectedText: string): Promise<FlashCard[]> {
    const languageLevel = this.getLanguageLevelDescription();

    const prompt = `Generate flashcards in JSON format based on the provided text, matching this TypeScript interface:

interface FlashCard {
    id: string;
    question: string;
    answer: string;
}

## Requirements:
1. **Text Source**: Extract key vocabulary, concepts, or facts from the provided text
2. **Language Level**: Adapt for ${languageLevel} English learners
3. **Card Structure**:
   - Question side: Ask about word meanings, definitions, or key concepts
   - Answer side: Provide clear, concise explanations
4. **Format**: Return ONLY a valid JSON array of FlashCard objects

## Source Text:
${selectedText}

Generate 3-8 flashcards depending on the text length and vocabulary richness.`;

    try {
      const response = await this.callGeminiAPI(prompt);

      // Clean up the response to extract JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const flashcards = JSON.parse(jsonMatch[0]);
      return flashcards;
    } catch (error) {
      console.error("Error generating flashcards:", error);
      throw error;
    }
  }

  async generateWritingTasks(selectedText: string): Promise<WritingTask[]> {
    const languageLevel = this.getLanguageLevelDescription();

    const prompt = `Generate writing tasks in JSON format based on the provided text, matching this TypeScript interface:

interface WritingTask {
    id: string;
    title: string;
    prompt: string;
    maxWords: number;
    timeLimit: number; // in minutes
}

## Requirements:
1. **Text Source**: Create writing prompts inspired by themes, topics, or concepts from the provided text
2. **Language Level**: Adapt difficulty and expectations for ${languageLevel} English learners
3. **Task Structure**:
   - Title: Short, descriptive name for the task
   - Prompt: Clear writing instruction with specific requirements
   - Word limits: Appropriate for the language level (50-300 words)
   - Time limits: Reasonable for the task complexity (5-20 minutes)
4. **Format**: Return ONLY a valid JSON array of WritingTask objects

## Source Text:
${selectedText}

Generate 1-3 writing tasks that encourage creative or analytical thinking about the text's themes.`;

    try {
      const response = await this.callGeminiAPI(prompt);

      // Clean up the response to extract JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const writingTasks = JSON.parse(jsonMatch[0]);
      return writingTasks;
    } catch (error) {
      console.error("Error generating writing tasks:", error);
      throw error;
    }
  }

  async chatWithAI(message: string, conversationHistory?: Message[]): Promise<string> {
    const languageLevel = this.getLanguageLevelDescription();

    try {
      if (conversationHistory && conversationHistory.length > 0) {
        // Multi-turn conversation with history
        const response = await this.callGeminiAPIWithHistory(message, conversationHistory);
        return response.trim();
      } else {
        // Single message (backward compatibility)
        const systemPrompt = `You are a helpful AI assistant designed to support ${languageLevel} English learners. Please:

1. **Communication Style**:
   - Use clear, appropriate language for ${languageLevel} proficiency
   - Be conversational and engaging
   - Provide helpful and accurate information

2. **Content Guidelines**:
   - Answer questions thoughtfully and thoroughly
   - Offer examples when helpful
   - Be supportive of learning goals
   - Adapt your responses to the user's apparent English level

3. **Response Format**:
   - Use natural, conversational language
   - Break down complex concepts when needed
   - Be encouraging and positive

User message: ${message}`;

        const response = await this.callGeminiAPI(systemPrompt);
        return response.trim();
      }
    } catch (error) {
      console.error("Error in chat with AI:", error);
      throw error;
    }
  }
}

// Create a singleton instance
let llmServiceInstance: LLMService | null = null;

export const getLLMService = (settings: AppSettings): LLMService => {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService(settings);
  } else {
    llmServiceInstance.updateSettings(settings);
  }
  return llmServiceInstance;
};

export type { MultipleChoiceQuiz, FlashCard, WritingTask };
