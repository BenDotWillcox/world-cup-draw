"use client";

import { useSyncExternalStore } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DrawVisualizer } from "@/components/draw/DrawVisualizer";
import { MonteCarloStats } from "@/components/draw/MonteCarloStats";
import { TeamPathMap } from "@/components/draw/TeamPathMap";
import { DrawProvider } from "@/components/draw/DrawContext";

export default function Home() {
  const activeTab = useSyncExternalStore(subscribeToTab, getTabSnapshot, getServerTabSnapshot);

  const changeTab = (tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event("world-cup-tab-change"));
  };

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
          <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
            <TabsList className="grid h-auto min-h-9 w-full max-w-xl grid-cols-3">
              <TabsTrigger className="h-full whitespace-normal py-2 text-xs sm:text-sm" value="visualizer">Visual Draw</TabsTrigger>
              <TabsTrigger className="h-full whitespace-normal py-2 text-xs sm:text-sm" value="stats">Stats (Reference)</TabsTrigger>
              <TabsTrigger className="h-full whitespace-normal py-2 text-xs sm:text-sm" value="map">Paths (Official Draw)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="visualizer" className="mt-6">
              <DrawVisualizer />
            </TabsContent>
            
            <TabsContent value="stats" className="mt-6">
              <MonteCarloStats />
            </TabsContent>

            <TabsContent value="map" className="mt-6">
              <TeamPathMap />
            </TabsContent>
          </Tabs>
        </DrawProvider>
      </main>
    </div>
  );
}

function subscribeToTab(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("world-cup-tab-change", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("world-cup-tab-change", onStoreChange);
  };
}

function getTabSnapshot() {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tab === "stats" || tab === "map" ? tab : "visualizer";
}

function getServerTabSnapshot() {
  return "visualizer";
}
