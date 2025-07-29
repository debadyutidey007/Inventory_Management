
"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const themes = [
    { name: "dark", label: "Dark Mode", description: "Enable for a dark interface." },
    { name: "theme-stone", label: "Stone Theme", description: "A sleek, modern theme with neutral grays." },
    { name: "theme-orange", label: "Orange Theme", description: "A vibrant and energetic theme." },
    { name: "theme-green", label: "Green Theme", description: "A calm and nature-inspired theme." },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [activeTheme, setActiveTheme] = React.useState("light");
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem("theme") || 'light';
    setActiveTheme(savedTheme);

    const savedName = localStorage.getItem("profileName") || "Manager";
    const savedEmail = localStorage.getItem("profileEmail") || "manager@example.com";
    setName(savedName);
    setEmail(savedEmail);
  }, []);

  React.useEffect(() => {
    if (isMounted) {
      // Clear all possible theme classes first
      document.documentElement.classList.remove('dark', 'theme-stone', 'theme-orange', 'theme-green');

      // Add the new theme class if it's not the default light theme
      if (activeTheme !== 'light') {
        document.documentElement.classList.add(activeTheme);
      }
      localStorage.setItem("theme", activeTheme);
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: activeTheme }));
    }
  }, [activeTheme, isMounted]);
  

  const handleThemeToggle = (themeName: string, checked: boolean) => {
    const newTheme = checked ? themeName : 'light';
    setActiveTheme(newTheme);
  };

  const handleProfileSave = () => {
    localStorage.setItem("profileName", name);
    localStorage.setItem("profileEmail", email);
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully.",
    });
     // Manually dispatch storage events
    window.dispatchEvent(new StorageEvent('storage', { key: 'profileName', newValue: name }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'profileEmail', newValue: email }));
  };

  if (!isMounted) {
    return null; // Render nothing until the client-side logic has run
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account and application settings."
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleProfileSave}>Save</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {themes.map((theme) => (
                <div key={theme.name} className="flex items-center justify-between rounded-lg border p-4">
                    <Label htmlFor={theme.name} className="flex flex-col space-y-1">
                        <span>{theme.label}</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            {theme.description}
                        </span>
                    </Label>
                    <Switch
                        id={theme.name}
                        aria-label={`Toggle ${theme.label}`}
                        checked={activeTheme === theme.name}
                        onCheckedChange={(checked) => handleThemeToggle(theme.name, checked)}
                    />
                </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
