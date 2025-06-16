"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface ApplicationStatusSelectProps {
  applicationId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

const statusOptions = [
  { value: "to_apply", label: "To Apply", color: "text-blue-600" },
  { value: "applied", label: "Applied", color: "text-yellow-600" },
  { value: "interviewing", label: "Interviewing", color: "text-purple-600" },
  { value: "offered", label: "Offered", color: "text-green-600" },
  { value: "rejected", label: "Rejected", color: "text-red-600" },
];

export function ApplicationStatusSelect({
  applicationId,
  currentStatus,
  onStatusChange,
}: ApplicationStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(newStatus);
        toast({
          title: "Status Updated",
          description: `Application status changed to ${newStatus}`,
        });
        
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      } else {
        toast({
          title: "Update Failed",
          description: data.error || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Update Failed",
        description: "An error occurred while updating status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const currentOption = statusOptions.find((opt) => opt.value === status);

  return (
    <Select
      value={status}
      onValueChange={handleStatusChange}
      disabled={updating}
    >
      <SelectTrigger className="w-[140px] h-8">
        <SelectValue>
          <span className={currentOption?.color}>
            {currentOption?.label || "Unknown"}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className={option.color}>{option.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}