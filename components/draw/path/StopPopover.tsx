"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, X } from "lucide-react";
import { type BracketPathNode } from "@/lib/engine/path-logic";
import { OpponentList } from "./OpponentList";
import { Button } from "@/components/ui/button";

interface StopPopoverProps {
  node: BracketPathNode;
  position: 1 | 2 | 3;
  onClose: () => void;
}

const POSITION_LABELS: Record<number, string> = {
  1: "1st Place Path",
  2: "2nd Place Path",
  3: "3rd Place Path",
};

const POSITION_COLORS: Record<number, string> = {
  1: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  2: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  3: "bg-purple-500/10 text-purple-600 border-purple-500/30",
};

export function StopPopover({ node, position, onClose }: StopPopoverProps) {
  return (
    <Card className="w-80 shadow-lg animate-in fade-in zoom-in-95 duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{node.round}</CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={POSITION_COLORS[position]}>
              {POSITION_LABELS[position]}
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{node.date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{node.time}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">
            Possible opponents ({node.opponents.length})
          </div>
          <div className="max-h-[200px] overflow-y-auto scrollbar-thin">
            <OpponentList opponents={node.opponents} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
          <MapPin className="h-3 w-3" />
          <span>{node.venue}</span>
          <span className="ml-auto font-mono text-[10px]">{node.matchId}</span>
        </div>
      </CardContent>
    </Card>
  );
}
