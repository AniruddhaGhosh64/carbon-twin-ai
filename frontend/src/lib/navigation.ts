import { 
  LayoutDashboard, 
  Footprints, 
  Workflow, 
  Sliders, 
  MapPinned, 
  TrendingUp 
} from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const navigationItems: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Footprint",
    href: "/footprint",
    icon: Footprints,
  },
  {
    name: "Carbon Twin",
    href: "/carbon-twin",
    icon: Workflow,
  },
  {
    name: "Impact Simulator",
    href: "/simulator",
    icon: Sliders,
  },
  {
    name: "Eco Actions",
    href: "/eco-actions",
    icon: MapPinned,
  },
  {
    name: "Progress",
    href: "/progress",
    icon: TrendingUp,
  },
];
