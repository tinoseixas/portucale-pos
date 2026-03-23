import { Metadata } from "next";
import RestaurantLayoutClient from "./RestaurantLayoutClient";

export const metadata: Metadata = {
  title: 'Gestão Portucale',
  description: 'Sistema de Ponto de Venda e Gestão de Restaurante',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
  return <RestaurantLayoutClient>{children}</RestaurantLayoutClient>;
}
