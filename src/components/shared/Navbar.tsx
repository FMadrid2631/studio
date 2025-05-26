
'use client';
import Link from 'next/link';
import { Home, PlusCircle, Ticket, UserCircle, LogIn, UserPlus, LogOut, ShieldCheck } from 'lucide-react'; // Changed Settings to ShieldCheck
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/contexts/LocalizationContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslations();
  const { currentUser, logout, isLoading } = useAuth();

  const navItems = [
    { href: '/', labelKey: 'navbar.home', icon: Home },
    { href: '/configure', labelKey: 'navbar.newRaffle', icon: PlusCircle },
  ];

  const handleLogout = async () => {
    await logout();
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <nav className="border-b bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <Ticket className="w-8 h-8" />
          <h1 className="text-2xl font-bold">{t('app.title')}</h1>
        </Link>
        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'default' : 'ghost'}
              asChild
              className={cn(pathname === item.href ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground")}
            >
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="w-4 h-4" />
                {t(item.labelKey)}
              </Link>
            </Button>
          ))}
          <LanguageSwitcher />

          {isLoading ? (
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials(currentUser.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser.displayName || t('auth.anonymousUser')}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>{t('auth.profile')}</span>
                </DropdownMenuItem>
                {currentUser.role === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/admin/users')}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> {/* Changed icon to ShieldCheck */}
                    <span>{t('navbar.adminUsers')}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('auth.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" /> {t('auth.login')}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/signup">
                  <UserPlus className="mr-2 h-4 w-4" /> {t('auth.signup')}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
    