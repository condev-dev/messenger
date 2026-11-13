"use client";

import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { motion, AnimatePresence } from "framer-motion";
import { Reply, Pencil, Copy, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { menuPop } from "@/lib/motion";

export type MessageMenuAction = "reply" | "edit" | "copy" | "delete";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** محل باز شدن منو (نسبت به viewport). */
  anchor: { x: number; y: number } | null;
  mine: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAction: (action: MessageMenuAction) => void;
};

type ItemProps = {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  closeMenu: () => void;
};

function Item({ label, icon, onSelect, destructive, closeMenu }: ItemProps) {
  return (
    <MenuPrimitive.Item
      onClick={() => {
        onSelect();
        closeMenu();
      }}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm select-none outline-none cursor-default",
        "transition-colors duration-100",
        destructive
          ? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
          : "text-foreground hover:bg-accent focus:bg-accent"
      )}
    >
      <span className="size-4 grid place-items-center [&_svg]:size-4 opacity-90">
        {icon}
      </span>
      <span className="flex-1 text-start">{label}</span>
    </MenuPrimitive.Item>
  );
}

/** منوی باز شونده با راست‌کلیک یا long-press روی پیام. */
export function MessageContextMenu({
  open,
  onOpenChange,
  anchor,
  mine,
  canEdit,
  canDelete,
  onAction,
}: Props) {
  const closeMenu = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  // Virtual element برای Positioner
  const virtualAnchor = React.useMemo(() => {
    if (!anchor) return null;
    return {
      getBoundingClientRect: () => ({
        x: anchor.x,
        y: anchor.y,
        top: anchor.y,
        left: anchor.x,
        right: anchor.x,
        bottom: anchor.y,
        width: 0,
        height: 0,
        toJSON() {
          return this;
        },
      }),
    };
  }, [anchor]);

  return (
    <MenuPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <MenuPrimitive.Portal>
        <AnimatePresence>
          {open && virtualAnchor && (
            <MenuPrimitive.Positioner
              anchor={virtualAnchor}
              side="bottom"
              align="start"
              sideOffset={6}
              className="isolate z-50 outline-none"
            >
              <MenuPrimitive.Popup
                render={(popupProps) => (
                  <motion.div
                    {...(popupProps as React.ComponentProps<typeof motion.div>)}
                    variants={menuPop}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className={cn(
                      "min-w-[200px] rounded-xl bg-popover p-1 text-popover-foreground",
                      "shadow-lg ring-1 ring-foreground/10 outline-none"
                    )}
                  />
                )}
              >
                <Item label="پاسخ" icon={<Reply />} onSelect={() => onAction("reply")} closeMenu={closeMenu} />
                {mine && canEdit && (
                  <Item label="ویرایش" icon={<Pencil />} onSelect={() => onAction("edit")} closeMenu={closeMenu} />
                )}
                <Item label="کپی متن" icon={<Copy />} onSelect={() => onAction("copy")} closeMenu={closeMenu} />
                {mine && canDelete && (
                  <Item
                    label="حذف"
                    icon={<Trash2 />}
                    onSelect={() => onAction("delete")}
                    destructive
                    closeMenu={closeMenu}
                  />
                )}
                <MenuPrimitive.Separator className="my-1 h-px bg-border" />
                <Item label="بستن" icon={<X />} onSelect={closeMenu} closeMenu={closeMenu} />
              </MenuPrimitive.Popup>
            </MenuPrimitive.Positioner>
          )}
        </AnimatePresence>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
