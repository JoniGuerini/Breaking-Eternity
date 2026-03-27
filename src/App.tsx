import { useState } from "react"
import { GameProvider } from "@/components/game-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { GeneratorsPage } from "@/pages/GeneratorsPage"
import { OptionsPage } from "@/pages/OptionsPage"
import { UpgradesPage } from "@/pages/UpgradesPage"

function App() {
  const [activeTab, setActiveTab] = useState("generators")

  return (
    <TooltipProvider delayDuration={300}>
      <GameProvider>
        <div className="flex min-h-0 w-full flex-1 flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 w-full flex-1 flex-col gap-0 overflow-hidden bg-background text-foreground"
          >
            <Header />
            <main className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden">
              <TabsContent value="generators" className="mt-0">
                <GeneratorsPage />
              </TabsContent>
              <TabsContent value="upgrades" className="mt-0">
                <UpgradesPage />
              </TabsContent>
              <TabsContent value="options" className="mt-0">
                <OptionsPage />
              </TabsContent>
            </main>
            <Footer />
          </Tabs>
        </div>
      </GameProvider>
    </TooltipProvider>
  )
}

export default App
