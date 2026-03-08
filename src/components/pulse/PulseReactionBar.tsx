import { motion } from "framer-motion";
import { REACTION_EMOJIS, getEmojiChar, type EmojiType } from "@/hooks/usePulse";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PulseReactionBarProps {
  reactions: Record<string, { count: number; users: string[]; myReaction: boolean }>;
  isOwnEvent: boolean;
  onReact: (emoji: EmojiType) => void;
}

export default function PulseReactionBar({ reactions, isOwnEvent, onReact }: PulseReactionBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 mt-2">
        {REACTION_EMOJIS.map((emoji) => {
          const r = reactions[emoji] || { count: 0, myReaction: false };
          const isActive = r.myReaction;

          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <motion.button
                  whileTap={!isOwnEvent ? { scale: 1.3 } : undefined}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  onClick={() => !isOwnEvent && onReact(emoji)}
                  disabled={isOwnEvent}
                  className={`flex items-center gap-1 rounded-full px-2 py-1 transition-all text-sm ${
                    isOwnEvent
                      ? "opacity-50 cursor-not-allowed"
                      : isActive
                      ? "bg-primary/10 shadow-sm"
                      : "hover:bg-accent"
                  }`}
                >
                  <span className={isActive ? "text-lg" : "text-base"}>{getEmojiChar(emoji)}</span>
                  {r.count > 0 && (
                    <span className="text-xs text-muted-foreground font-medium">{r.count}</span>
                  )}
                </motion.button>
              </TooltipTrigger>
              {isOwnEvent && (
                <TooltipContent><p className="text-xs">Você não pode reagir ao próprio evento</p></TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
