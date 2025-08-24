import { Button } from "@/components/ui/button";
import { Clock, Settings, Plus, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import animeAvatar from "@assets/a3922c432494e8836b1e11e9722c7115_1755968455298.jpg";

interface HeaderProps {
  onHistoryClick: () => void;
  onSettingsClick: () => void;
}

export function Header({ onHistoryClick, onSettingsClick }: HeaderProps) {
  const { user } = useAuth() as { user: User | null };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-dark-surface/80 border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full border-3 border-anime-orange overflow-hidden">
              <img src={animeAvatar} alt="AniVerse AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-white">AniVerse AI</h1>
              <p className="text-xs text-gray-400">Manga & Anime Intelligence</p>
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center space-x-2">
            {user && (
              <div className="hidden sm:flex items-center space-x-3 mr-4">
                {user.profileImageUrl && (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border-2 border-anime-orange object-cover"
                  />
                )}
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {user.firstName || user.email}
                  </p>
                  <p className="text-xs text-gray-400">Welcome back!</p>
                </div>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onHistoryClick}
              className="hidden sm:flex items-center space-x-2 bg-dark-surface hover:bg-dark-border border-dark-border text-gray-300 hover:text-white"
              data-testid="button-history"
            >
              <Clock className="w-4 h-4" />
              <span>History</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onSettingsClick}
              className="hidden sm:flex items-center space-x-2 bg-dark-surface hover:bg-dark-border border-dark-border text-gray-300 hover:text-white"
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-dark-surface hover:bg-dark-border border-dark-border text-gray-300 hover:text-white"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>

            {/* Mobile menu buttons */}
            <div className="flex sm:hidden space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onHistoryClick}
                className="p-2 bg-dark-surface hover:bg-dark-border border-dark-border text-gray-300 hover:text-white"
                data-testid="button-history-mobile"
              >
                <Clock className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSettingsClick}
                className="p-2 bg-dark-surface hover:bg-dark-border border-dark-border text-gray-300 hover:text-white"
                data-testid="button-settings-mobile"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}