"use client";

import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizeTopic } from '@/utils/topic';

interface TopicComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function TopicCombobox({ value, onChange, suggestions, placeholder = "Topic...", className }: TopicComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const normalizedValue = normalizeTopic(value);

  const handleSelect = (selectedValue: string) => {
    onChange(normalizeTopic(selectedValue));
    setOpen(false);
    setInputValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal bg-background h-8 text-xs px-2 border-input hover:bg-background hover:text-foreground",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or add..."
            value={inputValue}
            onValueChange={setInputValue}
            className="h-8 text-xs"
          />
          <CommandList>
            <CommandEmpty className="p-1">
              {inputValue.trim() ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => handleSelect(inputValue)}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Create "{normalizeTopic(inputValue)}"
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground px-2 py-1 block text-center">No topics found.</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={() => handleSelect(suggestion)}
                  className="text-xs py-1 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3 text-primary",
                      normalizedValue === suggestion ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {suggestion}
                </CommandItem>
              ))}
              
              {/* Show create option if typed text isn't already an exact match in the suggestions */}
              {inputValue.trim() && !suggestions.some(s => s.toLowerCase() === inputValue.trim().toLowerCase()) && (
                <CommandItem
                  value={inputValue}
                  onSelect={() => handleSelect(inputValue)}
                  className="text-xs text-primary font-medium py-1 cursor-pointer mt-1 border-t"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Create "{normalizeTopic(inputValue)}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}