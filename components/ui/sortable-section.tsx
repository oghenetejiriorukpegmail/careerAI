"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { GripVertical } from "lucide-react";
import { ReactNode } from "react";

interface SortableSectionProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function SortableSection({ id, children, className = "" }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      <div
        className="absolute left-2 top-4 cursor-grab hover:bg-gray-100 rounded p-1 print:hidden"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <Card className={`${className} ${isDragging ? "shadow-2xl" : ""}`}>
        {children}
      </Card>
    </div>
  );
}