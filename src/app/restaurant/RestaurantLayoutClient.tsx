import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ShoppingBag, ChefHat, Smartphone, CalendarDays, BellRing, Calculator, BarChart3, Bell } from "lucide-react";
import { ReservationAlert } from "@/components/ReservationAlert";

export default function RestaurantLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Fullscreen Semi-Automático: Ativa ao primeiro clique para imersão total
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  const tabs = [
    { name: "POS de Vendas", path: "/restaurant/pos", icon: Calculator },
    { name: "Mesas", path: "/restaurant/mesas", icon: LayoutGrid },
    { name: "Balcão (Entregas)", path: "/restaurant/balcao", icon: BellRing },
    { name: "Cozinha", path: "/restaurant/cozinha", icon: ChefHat },
    { name: "Takeaway", path: "/restaurant/takeaway", icon: ShoppingBag },
    { name: "Gestão de Vendas", path: "/restaurant/vendas", icon: BarChart3 },
    { name: "Reservas", path: "/restaurant/reservas", icon: CalendarDays },
    { name: "App Garçom", path: "/restaurant/garcom", icon: Smartphone },
  ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Global Apps Tab Bar */}
      <div className="bg-slate-900 text-white px-3 py-2 flex items-center shrink-0 overflow-x-auto no-scrollbar shadow-lg z-[60] border-b border-slate-800">
        <div className="flex items-center gap-1 min-w-max">
          <img src="/logo.svg" alt="Portucale" className="h-8 w-auto object-contain mx-2 mr-4 hidden md:block" onError={(e) => { e.currentTarget.style.display='none' }} />
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.path || (pathname === "/restaurant" && tab.path === "/restaurant/pos");
            return (
              <Link 
                key={tab.path} 
                href={tab.path}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap ${
                  isActive 
                    ? "bg-blue-600 text-white font-bold shadow-md ring-1 ring-blue-500" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white font-medium"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm tracking-wide">{tab.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
      
      {/* Reservation Alerts Overlay */}
      <ReservationAlert />
      
      {/* Page Content */}
      <div className="flex-1 overflow-hidden relative z-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}
