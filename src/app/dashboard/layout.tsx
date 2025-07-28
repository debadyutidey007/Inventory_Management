
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandMenu } from '@/components/command-menu';
import type { Item, Category } from '@/types';
import { getItems, getCategories } from '@/lib/data';

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


  React.useEffect(() => {
    setIsMounted(true);
    try {
        const savedSidebarState = localStorage.getItem('sidebar-collapsed');
        if (savedSidebarState) {
            setIsCollapsed(JSON.parse(savedSidebarState));
        }
    } catch (error) {
        console.error("Failed to parse from localStorage", error);
    }

    const checkIsMobile = () => {
        const isMobileDevice = window.innerWidth < 768;
        setIsMobile(isMobileDevice);
        if(!isMounted && isMobileDevice) { // On initial mount, collapse if mobile
            setIsCollapsed(true);
        }
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    setItems(getItems());
    setCategories(getCategories());
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

  if (!isMounted) {
    return (
        <div className="grid min-h-screen w-full md:grid-cols-[256px_1fr]">
             <div className="relative hidden h-screen border-r bg-background transition-all md:block w-64">
                 <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-16 items-center border-b px-6">
                        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                            <Package className="h-6 w-6 text-primary" />
                            <span>Inventory Manager</span>
                        </Link>
                    </div>
                 </div>
             </div>
             <div className="flex flex-col">
                <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-muted/40 overflow-auto">
                    {children}
                </main>
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
      <div className="flex flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="user avatar" alt="User avatar" />
                  <AvatarFallback>
                    <User />
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/"><LogOut className="mr-2 h-4 w-4" />Logout</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-muted/40 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
