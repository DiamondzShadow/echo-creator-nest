import { Film, Gamepad2, Music, GraduationCap, Newspaper, Sparkles, Laptop, Plane, MoreHorizontal } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const categories = [
  { title: "All", icon: Film, value: null },
  { title: "Gaming", icon: Gamepad2, value: "Gaming" },
  { title: "Music", icon: Music, value: "Music" },
  { title: "Education", icon: GraduationCap, value: "Education" },
  { title: "News", icon: Newspaper, value: "News" },
  { title: "Entertainment", icon: Sparkles, value: "Entertainment" },
  { title: "Science & Tech", icon: Laptop, value: "Science & Technology" },
  { title: "Travel", icon: Plane, value: "Travel" },
  { title: "Other", icon: MoreHorizontal, value: "Other" },
];

interface VideoSidebarProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export function VideoSidebar({ selectedCategory, onCategoryChange }: VideoSidebarProps) {
  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((category) => {
                const isActive = selectedCategory === category.value;
                return (
                  <SidebarMenuItem key={category.title}>
                    <SidebarMenuButton
                      onClick={() => onCategoryChange(category.value)}
                      className={isActive ? "bg-accent text-accent-foreground font-medium" : ""}
                    >
                      <category.icon className="h-4 w-4" />
                      <span>{category.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
