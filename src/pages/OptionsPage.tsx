import React from "react"
import { useTheme } from "@/components/theme-provider"
import { useGame } from "@/components/game-provider"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { 
  Sun, 
  Moon, 
  Trash2 
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export const OptionsPage: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const { state, toggleFps, resetGame } = useGame()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 scrollbar-game">
      <div className="grid gap-6 max-w-2xl mx-auto w-full pb-8">
        {/* Visual Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações Visuais</CardTitle>
            <CardDescription>Ajuste a aparência e performance do jogo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Esquema de Cores</Label>
                <p className="text-sm text-muted-foreground">Alternar entre tema claro e escuro</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 dark:hidden" />
                <Moon className="h-4 w-4 hidden dark:block" />
                <span className="sr-only">Alternar tema</span>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Contador de FPS</Label>
                <p className="text-sm text-muted-foreground">Exibir a taxa de quadros no cabeçalho</p>
              </div>
              <Switch 
                checked={state.showFps} 
                onCheckedChange={toggleFps}
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
            <CardDescription>Ações irreversíveis que apagarão todo o seu progresso</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2">
                  <Trash2 className="h-4 w-4" />
                  Resetar Todo o Progresso
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso removerá permanentemente seu progresso de jogo,
                    incluindo todos os recursos acumulados e estatísticas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={resetGame}>Sim, Resetar Agora</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
