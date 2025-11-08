import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Globe, Home, Map, Info, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl hover:text-primary transition-colors">
            <Globe className="w-6 h-6 text-primary" />
            <span>Climate Inequality Index</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2",
                isActive("/") && "bg-muted text-primary"
              )}
            >
              <Link to="/">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </Button>
            
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2",
                isActive("/dashboard") && "bg-muted text-primary"
              )}
            >
              <Link to="/dashboard">
                <Map className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2",
                isActive("/about") && "bg-muted text-primary"
              )}
            >
              <Link to="/about">
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">About</span>
              </Link>
            </Button>
            
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2",
                isActive("/methodology") && "bg-muted text-primary"
              )}
            >
              <Link to="/methodology">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Methodology</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
