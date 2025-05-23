
'use client';
import Link from 'next/link';
import { Home, PlusCircle, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/contexts/LocalizationContext';
import { LanguageSwitcher } from './LanguageSwitcher'; // Import LanguageSwitcher

export function Navbar() {
  const pathname = usePathname();
  const { t } = useTranslations(); 

  const navItems = [
    { href: '/', labelKey: 'navbar.home', icon: Home },
    { href: '/configure', labelKey: 'navbar.newRaffle', icon: PlusCircle },
  ];
  
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
        </div>
      </div>
    </nav>
  );
}
