import { Link, useLocation } from "wouter";
import {
  BookOpen,
  Upload,
  Wand2,
  CheckSquare,
  GraduationCap,
  MessageCircle,
  FileQuestion,
  Settings,
  Bell,
  Library,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/", label: "Dashboard", icon: BookOpen },
  { href: "/upload", label: "Upload Material", icon: Upload },
  { href: "/generate", label: "Course Generation", icon: Wand2 },
  { href: "/review", label: "Course Review", icon: CheckSquare },
  { href: "/courses", label: "Course Library", icon: Library },
  { href: "/student-course", label: "Student View", icon: GraduationCap },
  { href: "/tutor", label: "AI Tutor", icon: MessageCircle },
  { href: "/test", label: "Unit Test", icon: FileQuestion },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const activeLabel = navItems.find((i) => i.href === location)?.label;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <GraduationCap className="w-6 h-6" />
            EduGenAI
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : "text-sidebar-foreground/70"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 bg-primary-foreground border border-sidebar-border">
              <AvatarFallback className="bg-primary/10 text-primary">DA</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none text-sidebar-foreground">Dr. Ahmed</span>
              <span className="text-xs text-sidebar-foreground/60 mt-0.5">Professor</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-8 flex-shrink-0">
          <h1 className="text-lg font-semibold text-foreground">
            {activeLabel || "EduGenAI"}
          </h1>
          <div className="flex items-center gap-4">
            <button className="text-muted-foreground hover:text-foreground transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full"></span>
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background p-8">
          <div className="max-w-5xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
