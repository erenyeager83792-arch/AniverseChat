import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Download, Github, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ChatSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatSettings({ open, onOpenChange }: ChatSettingsProps) {
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("english");

  const installPWA = () => {
    // Check if the app can be installed
    if ('BeforeInstallPromptEvent' in window) {
      // This would trigger the PWA install prompt
      window.dispatchEvent(new Event('beforeinstallprompt'));
    } else {
      // Fallback message for browsers that don't support PWA installation
      alert("To install AniVerse AI as an app:\n\n1. In Chrome/Edge: Click the install icon in the address bar\n2. In Safari: Tap Share > Add to Home Screen\n3. In Firefox: Look for 'Install' option in the menu");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-dark-surface border border-dark-border text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-anime-orange" />
            <span>Settings</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Notifications */}
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-sm font-medium">
              Enable Notifications
            </Label>
            <Switch
              id="notifications"
              checked={enableNotifications}
              onCheckedChange={setEnableNotifications}
              data-testid="switch-notifications"
            />
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="bg-dark-muted border-dark-border" data-testid="select-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-dark-surface border-dark-border">
                <SelectItem value="dark">Dark Mode</SelectItem>
                <SelectItem value="light">Light Mode</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-dark-muted border-dark-border" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-dark-surface border-dark-border">
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="japanese">日本語</SelectItem>
                <SelectItem value="spanish">Español</SelectItem>
                <SelectItem value="french">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Install PWA */}
          <div className="pt-4 border-t border-dark-border">
            <Button
              onClick={installPWA}
              variant="outline"
              className="w-full border-anime-orange text-anime-orange hover:bg-anime-orange hover:text-white transition-colors"
              data-testid="button-install-pwa"
            >
              <Download className="w-4 h-4 mr-2" />
              Install as App
            </Button>
          </div>

          {/* About */}
          <div className="pt-4 border-t border-dark-border space-y-3">
            <h3 className="text-sm font-medium">About AniVerse AI</h3>
            <p className="text-xs text-gray-400">
              Your intelligent companion for everything Manga & Anime. Powered by advanced AI technology.
            </p>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white p-2"
                onClick={() => window.open('https://github.com', '_blank')}
                data-testid="button-github"
              >
                <Github className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white p-2"
                onClick={() => window.open('https://aniverse-ai.replit.app', '_blank')}
                data-testid="button-website"
              >
                <Globe className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}