import React from "react"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Settings } from "lucide-react"

interface FooterProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const Footer: React.FC<FooterProps> = ({ activeTab, setActiveTab }) => {
  return (
    <footer className="border-t border-muted-foreground/10 bg-secondary/50 sticky bottom-0 z-50 p-3 flex items-center justify-center gap-4">
      <Button
        variant={activeTab === "generators" ? "secondary" : "ghost"}
        className={`flex-1 max-w-[200px] h-12 gap-2 font-medium ${activeTab === "generators" ? "bg-background/50 shadow-sm" : ""}`}
        onClick={() => setActiveTab("generators")}
      >
        <LayoutGrid className="h-5 w-5" />
        Geradores
      </Button>
      <Button
        variant={activeTab === "options" ? "secondary" : "ghost"}
        className={`flex-1 max-w-[200px] h-12 gap-2 font-medium ${activeTab === "options" ? "bg-background/50 shadow-sm" : ""}`}
        onClick={() => setActiveTab("options")}
      >
        <Settings className="h-5 w-5" />
        Opções
      </Button>
    </footer>
  )
}
