
"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings,
  Shapes,
  FileText,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Github,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandMenu } from '@/components/command-menu';
import type { Item, Category } from '@/types';
import { getItems, getCategories } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/items', icon: Package, label: 'Items' },
  { href: '/dashboard/categories', icon: Shapes, label: 'Categories' },
  { href: '/dashboard/reports', icon: FileText, label: 'Reports' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [openCommandMenu, setOpenCommandMenu] = React.useState(false);
  const [items, setItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [profileName, setProfileName] = React.useState("Manager");
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    // --- Authentication Check ---
    const authStatus = sessionStorage.getItem('isAuthenticated');
    if (authStatus !== 'true') {
        router.push('/');
    } else {
        setIsAuthenticated(true);
    }

    // --- Global Settings and Data Loading ---
    setIsMounted(true);

    // Sidebar state
    try {
        const savedSidebarState = localStorage.getItem('sidebar-collapsed');
        if (savedSidebarState) {
            setIsCollapsed(JSON.parse(savedSidebarState));
        }
    } catch (error) {
        console.error("Failed to parse sidebar state from localStorage", error);
    }
    
    // Theme
    const applyTheme = () => {
      const savedTheme = localStorage.getItem("theme") || 'light';
      
      // Clear existing theme classes
      document.documentElement.classList.remove('dark', 'theme-stone', 'theme-orange', 'theme-green');

      // Add the current theme class
      if (savedTheme !== 'light') {
        document.documentElement.classList.add(savedTheme);
      }
    };
    applyTheme();

    // Profile data
    const loadProfile = () => {
      const savedName = localStorage.getItem("profileName");
      setProfileName(savedName || "Manager");
    }
    loadProfile();

    // Inventory data
    setItems(getItems());
    setCategories(getCategories());
  
    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'items' || event.key === 'categories' || event.key === 'soldItems') {
        setItems(getItems());
        setCategories(getCategories());
      }
      if (event.key === 'theme') {
        applyTheme();
      }
      if (event.key === 'profileName') {
        loadProfile();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Mobile check
    const checkIsMobile = () => {
        const isMobileDevice = window.innerWidth < 768;
        setIsMobile(isMobileDevice);
        if(!isMounted && isMobileDevice) {
            setIsCollapsed(true);
        }
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
      window.removeEventListener('storage', handleStorageChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  React.useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isMounted]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpenCommandMenu((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    router.push('/');
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  }

  const NavLink = ({
    href,
    icon: Icon,
    label,
    isMobileSheet = false,
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
    isMobileSheet?: boolean;
  }) => {
    const isActive = pathname === href;

    if (isMobileSheet) {
      return (
        <Link
          href={href}
          className={cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-lg',
            isActive && 'bg-primary text-primary-foreground hover:text-primary-foreground'
          )}
        >
          <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
          {label}
        </Link>
      )
    }

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={href}
              className={cn(
                'group flex items-center justify-center h-10 w-10 rounded-lg text-muted-foreground transition-all duration-300 hover:text-primary hover:bg-muted',
                isActive && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                'hover:scale-130'
              )}
            >
               <Icon className="h-5 w-5 transition-transform duration-300" />
               <span className="sr-only">{label}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        href={href}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground',
          'transition-all duration-500 hover:scale-125',
          isActive && 'bg-primary text-primary-foreground'
        )}
      >
        <Icon className={cn(
            "h-5 w-5",
            "transition-transform duration-300"
        )} />
        <span className={cn(
            "ml-3",
            isCollapsed && !isMobileSheet && "hidden"
        )}>
          {label}
        </span>
        <span className="sr-only">{label}</span>
      </Link>
    );
  };

  if (!isMounted || !isAuthenticated) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center space-y-4">
                <Package className="h-12 w-12 animate-pulse text-primary" />
                <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
        </div>
    );
  }

  const desktopNav = (
    <div className={cn(
        "relative hidden h-screen border-r bg-background transition-all duration-300 md:block",
        isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Package className="h-6 w-6 text-primary" />
            {!isCollapsed && <span>Inventory Manager</span>}
          </Link>
        </div>
        <nav className={cn(
            "flex flex-col flex-1 items-start gap-2 px-4 py-4",
            isCollapsed && "items-center"
        )}>
          <TooltipProvider delayDuration={0}>
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </TooltipProvider>
        </nav>
        <div className={cn("mt-auto flex flex-col items-start gap-2 p-4", isCollapsed && "items-center")}>
            <Button variant="ghost" size="icon" onClick={toggleCollapse} className="rounded-full">
                {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
                <span className="sr-only">Toggle sidebar</span>
            </Button>
        </div>
      </div>
    </div>
  );

  const mobileNav = (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <nav className="grid gap-2 text-lg font-medium">
          <Link
            href="/dashboard"
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
          >
            <Package className="h-6 w-6 text-primary" />
            <span>Inventory Manager</span>
          </Link>
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} isMobileSheet />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className={cn(
        "grid min-h-screen w-full transition-all duration-300",
        !isMobile && (isCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[256px_1fr]")
    )}>
      {!isMobile && desktopNav}
      <div className="flex flex-col h-screen overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6">
          {isMobile && mobileNav}
          <div className="w-full flex-1">
            <Button
                variant="outline"
                className="flex w-full items-center justify-between text-muted-foreground shadow-none md:w-2/3 lg:w-1/3"
                onClick={() => setOpenCommandMenu(true)}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search products...
                </div>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
          </div>
          <CommandMenu 
            open={openCommandMenu} 
            onOpenChange={setOpenCommandMenu}
            items={items}
            categories={categories}
            router={router}
            />
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <a href="https://github.com/debadyutidey007/Inventory_Management" target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon">
                              <Github className="h-5 w-5" />
                              <span className="sr-only">GitHub Repository</span>
                          </Button>
                      </a>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>View on GitHub</p>
                  </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="group rounded-full transition-all duration-300 hover:scale-110 hover:bg-primary/10"
                  >
                    <User className="h-5 w-5 text-primary transition-all duration-300 group-hover:scale-110" />
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuLabel>{profileName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />Logout
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-muted/40 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
