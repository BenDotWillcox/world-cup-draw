import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DrawVisualizer } from "@/components/draw/DrawVisualizer";
import { MonteCarloStats } from "@/components/draw/MonteCarloStats";
import { DrawProvider } from "@/components/draw/DrawContext";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <main className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            World Cup 2026 Draw Simulator
          </h1>
          <p className="text-xl text-muted-foreground">
            Simulate the official draw procedures including constraints and probabilities.
          </p>
        </div>

        <DrawProvider>
          <Tabs defaultValue="visualizer" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="visualizer">Visual Draw</TabsTrigger>
              <TabsTrigger value="stats">Monte Carlo Stats</TabsTrigger>
            </TabsList>
            
            <TabsContent value="visualizer" className="mt-6">
              <DrawVisualizer />
            </TabsContent>
            
            <TabsContent value="stats" className="mt-6">
              <MonteCarloStats />
            </TabsContent>
          </Tabs>
        </DrawProvider>
      </main>
    </div>
  );
}
