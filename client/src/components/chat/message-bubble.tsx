import { Message } from "@/lib/chat-api";
import { cn } from "@/lib/utils";
import animeAvatar from "@assets/a3922c432494e8836b1e11e9722c7115_1755968455298.jpg";

interface MessageBubbleProps {
  message: Message;
  isLatest?: boolean;
}

export function MessageBubble({ message, isLatest }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit" 
  });

  return (
    <div className={cn(
      "flex message-fade-in",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className="max-w-xs sm:max-w-md lg:max-w-lg">
        {isUser ? (
          <div className="chat-bubble-user rounded-2xl rounded-br-md px-4 py-3 shadow-lg">
            <p className="text-white font-medium whitespace-pre-wrap" data-testid={`text-message-${message.id}`}>
              {message.content}
            </p>
            <span className="text-xs text-white/70 mt-1 block" data-testid={`text-timestamp-${message.id}`}>
              {timestamp}
            </span>
          </div>
        ) : (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full border-2 border-anime-orange flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
              <img src={animeAvatar} alt="AI Assistant" className="w-full h-full object-cover" />
            </div>
            <div className="chat-bubble-ai rounded-2xl rounded-bl-md px-4 py-3 shadow-lg">
              <p className="text-white leading-relaxed whitespace-pre-wrap" data-testid={`text-message-${message.id}`}>
                {message.content}
              </p>
              <span className="text-xs text-gray-400 mt-2 block" data-testid={`text-timestamp-${message.id}`}>
                {timestamp}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-xs sm:max-w-md lg:max-w-lg">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full border-2 border-anime-orange flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
            <img src={animeAvatar} alt="AI Assistant" className="w-full h-full object-cover" />
          </div>
          <div className="chat-bubble-ai rounded-2xl rounded-bl-md px-4 py-3 shadow-lg">
            <div className="flex space-x-1" data-testid="typing-indicator">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
