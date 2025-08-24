import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ChatHistory } from "@/components/chat/chat-history";
import { ChatSettings } from "@/components/chat/chat-settings";
import { Landing } from "@/components/Landing";
import { useAuth } from "@/hooks/useAuth";
import { chatApi } from "@/lib/chat-api";

function Router() {
  // Always authenticated now - no login required
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Create a new session when the app loads
    if (!currentSessionId) {
      const initializeSession = async () => {
        try {
          const session = await chatApi.createSession();
          setCurrentSessionId(session.id);
        } catch (error) {
          console.error("Failed to create initial session:", error);
        }
      };
      
      initializeSession();
    }
  }, [currentSessionId]);

  return (
    <Switch>
        <Route path="/">
          <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-dark-surface">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('/src/assets/file_00000000b8ac61f5b513d34bcf737fce_1755966573663.png')] bg-cover bg-center opacity-20 pointer-events-none"></div>
            
            <Header 
              onHistoryClick={() => setShowHistory(true)}
              onSettingsClick={() => setShowSettings(true)}
            />
            
            {currentSessionId ? (
              <ChatInterface sessionId={currentSessionId} />
            ) : (
              <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-anime-orange"></div>
              </div>
            )}
            
            <ChatHistory 
              currentSessionId={currentSessionId || undefined}
              onSessionSelect={setCurrentSessionId}
              open={showHistory}
              onOpenChange={setShowHistory}
            />
            
            <ChatSettings 
              open={showSettings}
              onOpenChange={setShowSettings}
            />
          </div>
        </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;