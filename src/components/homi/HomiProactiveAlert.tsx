import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHomi } from "@/contexts/HomiContext";
import { useHomiAlerts } from "@/hooks/useHomiAlerts";

const homiMascot = "/images/homi-mascot-opt.png";

function HomiProactiveAlertInner() {
  const { alerts, dismissAlert } = useHomi();
  useHomiAlerts(); // polls DB alerts and feeds into context

  const visibleAlerts = alerts.filter(a => !a.dismissed).slice(0, 2);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-16 right-6 z-[65] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {visibleAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative rounded-xl border shadow-lg p-4 pr-9 ${
              alert.priority === "critical"
                ? "bg-destructive/5 border-destructive/30"
                : alert.priority === "normal"
                ? "bg-primary/5 border-primary/30"
                : "bg-card border-border"
            }`}
          >
            <button
              onClick={() => dismissAlert(alert.id)}
              className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                <img src={homiMascot} alt="Homi" className="h-7 w-7 object-contain" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">{alert.message}</p>
                {alert.actions.length > 0 && (
                  <div className="flex gap-2 mt-2.5">
                    {alert.actions.map((action, i) => (
                      <Button
                        key={i}
                        variant={i === 0 ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs rounded-lg"
                        onClick={() => {
                          action.action();
                          dismissAlert(alert.id);
                        }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const HomiProactiveAlert = memo(HomiProactiveAlertInner);
export default HomiProactiveAlert;
