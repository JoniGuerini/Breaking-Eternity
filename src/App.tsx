import { useState } from "react"
import { GameProvider } from "@/components/game-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { GeneratorsPage } from "@/pages/GeneratorsPage"
import { OptionsPage } from "@/pages/OptionsPage"

function App() {
  const [activeTab, setActiveTab] = useState("generators")

  return (
    <ThemeProvider defaultTheme="dark" storageKey="breaking-eternity-theme">
      <GameProvider>
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <Header />
          <main className="flex-1 flex flex-col transition-all overflow-hidden">
            {activeTab === "generators" ? <GeneratorsPage /> : <OptionsPage />}
          </main>
          <Footer activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </GameProvider>
    </ThemeProvider>
  )
}

export default App
