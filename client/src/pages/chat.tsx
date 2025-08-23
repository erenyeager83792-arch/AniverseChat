import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { chatApi } from "@/lib/chat-api";

export default function Chat() {
  const [currentSessionId, setCurrentSessionId] = useState<string>("");

  // Get or create a session
  const { data: sessions } = useQuery({
    queryKey: ["/api/chat/sessions"],
    queryFn: () => chatApi.getSessions(),
  });

  useEffect(() => {
    const initializeSession = async () => {
      if (sessions && sessions.length > 0) {
        // Use the most recent session
        setCurrentSessionId(sessions[0].id);
      } else {
        // Create a new session
        try {
          const newSession = await chatApi.createSession();
          setCurrentSessionId(newSession.id);
        } catch (error) {
          console.error("Failed to create session:", error);
        }
      }
    };

    initializeSession();
  }, [sessions]);

  const handleHistoryClick = () => {
    // TODO: Implement history view
    console.log("History clicked");
  };

  const handleSettingsClick = () => {
    // TODO: Implement settings view
    console.log("Settings clicked");
  };

  if (!currentSessionId) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-anime-orange"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white font-body overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 manga-bg opacity-5"></div>
      
      {/* Background Image Overlay */}
      <div className="fixed inset-0 opacity-10 manga-character-bg"></div>
      
      <Navbar 
        onHistoryClick={handleHistoryClick}
        onSettingsClick={handleSettingsClick}
      />
      
      <ChatInterface sessionId={currentSessionId} />
    </div>
  );
}
