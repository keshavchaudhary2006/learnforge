import React, { useState, useRef, useEffect } from 'react';

/**
 * ChatInterface Component
 * Socratic AI learning dialog with message history and inquiry guidance.
 */
export default function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Greetings, scholar! I am your Socratic Mentor. Rather than giving you quick answers to memorize, I am here to help you uncover the fundamental principles through guided questions.\n\nWhat concept or challenge would you like to investigate today?",
      sources: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [topic, setTopic] = useState('Data Structures & Algorithms');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Suggested exploration prompts for fast discovery
  const suggestedPrompts = [
    "Why does binary search require a sorted array?",
    "Why does a recursive function need a base case?",
    "What is the difference between an array and a linked list?"
  ];

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessageId = `user_${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      sender: 'user',
      text: trimmedInput,
      topic: topic,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Append user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Build chat history for conversational context
    const chatHistory = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.sender === 'user' ? 'student' : 'tutor',
        content: m.text
      }));

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: trimmedInput,
          topic: topic,
          chat_history: chatHistory
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error (${response.status})`);
      }

      const resJson = await response.json();
      const aiData = resJson.data || resJson;

      const aiMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiData.socratic_response || aiData.guidance_question || "What foundational principle do you think applies here?",
        sources: aiData.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('[ChatInterface Error]', err);
      setError(err.message || 'Unable to connect to the learning server. Please ensure the backend services are running.');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-slate-50 border-x border-slate-200 shadow-xl">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-md">
            🏛️
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Learnforge</h1>
            <p className="text-xs font-medium text-slate-500">Socratic AI Learning Partner &bull; Inquiry-Driven RAG</p>
          </div>
        </div>

        {/* Topic Badge */}
        <div className="flex items-center space-x-2">
          <label htmlFor="topic-select" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Focus:
          </label>
          <select
            id="topic-select"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-1.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
          >
            <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
            <option value="Recursion & Call Stacks">Recursion & Call Stacks</option>
            <option value="Socratic Pedagogy">Socratic Pedagogy</option>
            <option value="Computer Systems">Computer Systems</option>
          </select>
        </div>
      </header>

      {/* Message History Window */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 shadow-sm ${
                  isUser
                    ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                    : 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200'
                }`}
              >
                {isUser ? 'You' : '🏛️'}
              </div>

              {/* Message Bubble Container */}
              <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Sender Name & Timestamp */}
                <div className="flex items-center space-x-2 mb-1 px-1">
                  <span className="text-xs font-semibold text-slate-600">
                    {isUser ? 'You' : 'Socratic Mentor'}
                  </span>
                  <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                </div>

                {/* Bubble */}
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none ring-1 ring-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Socratic Context / Sources Tag */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                      <div className="font-semibold text-indigo-900 flex items-center gap-1 mb-1.5">
                        <span>📚</span> Referenced Knowledge Base:
                      </div>
                      <div className="space-y-1.5">
                        {msg.sources.map((src, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 border border-slate-200/80 rounded p-2 text-slate-700 text-[11px]"
                          >
                            <span className="font-medium text-slate-900">{src.source}</span> (page {src.page}):
                            <span className="italic ml-1 text-slate-600">"{src.snippet}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200 flex items-center justify-center text-sm font-semibold shrink-0">
              🏛️
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center space-x-3 text-slate-500 text-sm">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce"></div>
              </div>
              <span className="text-xs italic text-slate-500">Formulating a guiding question...</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="font-bold hover:text-red-900 px-2 py-0.5 rounded text-sm"
            >
              &times;
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Suggested Inquiries (Show when conversation is fresh) */}
      {messages.length <= 2 && (
        <div className="px-6 py-2 bg-slate-50/80 border-t border-slate-200/60 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-semibold text-slate-400 shrink-0">Try asking:</span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(prompt);
                inputRef.current?.focus();
              }}
              className="shrink-0 bg-white hover:bg-sky-50 hover:border-sky-300 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-full transition-all shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Box Area */}
      <footer className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Pose a question or hypothesis (e.g. 'What makes binary search faster than linear scan?')..."
            className="flex-1 py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all disabled:opacity-60 placeholder:text-slate-400"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:bg-slate-300 text-white font-medium text-sm rounded-xl shadow-sm transition-colors flex items-center gap-2 shrink-0 disabled:cursor-not-allowed"
          >
            <span>Ask</span>
            <svg
              className="w-4 h-4 fill-current transform rotate-45"
              viewBox="0 0 20 20"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
        <p className="text-[11px] text-center text-slate-400 mt-2">
          Powered by LangChain &bull; ChromaDB Vector Search &bull; Socratic Method
        </p>
      </footer>
    </div>
  );
}
