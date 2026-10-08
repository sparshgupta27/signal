"use client";

import { forwardRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onChange }, ref) => {
    return (
      <Input
        ref={ref}
        placeholder="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onChange("");
        }}
        leadingIcon={<Search size={16} />}
        trailingIcon={
          value ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onChange("")}
              className="flex items-center justify-center rounded-full p-0.5 hover:text-primary"
            >
              <X size={14} />
            </button>
          ) : undefined
        }
      />
    );
  }
);
SearchField.displayName = "SearchField";
