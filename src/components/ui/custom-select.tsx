"use client";

import { useEffect, useRef, useState, useId } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  id?: string | undefined;
  name?: string | undefined;
  label?: string | undefined;
  value?: string | undefined;
  defaultValue?: string | undefined;
  options: readonly (string | CustomSelectOption)[];
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  ariaDescribedBy?: string | undefined;
  registerProps?: Record<string, unknown> | undefined;
  onChange?: ((value: string) => void) | undefined;
  className?: string | undefined;
}

function formatOptionLabel(val: string): string {
  const map: Record<string, string> = {
    AADHAAR: "Aadhaar Card",
    VOTER_ID: "Voter ID Card",
    PASSPORT: "Indian Passport",
    DRIVING_LICENSE: "Driving License",
    BIRTH_CERTIFICATE: "Birth Certificate",
    ATHLETE: "Athlete",
    ORGANIZER: "Tournament Organizer",
    SCOUT: "Talent Scout / Academy",
    CRICKET: "Cricket",
    FOOTBALL: "Football",
    BASKETBALL: "Basketball",
    BADMINTON: "Badminton",
    BATSMAN: "Batsman",
    BOWLER: "Bowler",
    ALL_ROUNDER: "All-Rounder",
    WICKET_KEEPER: "Wicket-Keeper",
    FORWARD: "Forward",
    MIDFIELDER: "Midfielder",
    DEFENDER: "Defender",
    GOALKEEPER: "Goalkeeper",
    MALE: "Male",
    FEMALE: "Female",
    OTHER: "Other",
    RIGHT: "Right-handed",
    LEFT: "Left-handed",
    ELITE: "Tier 1 · Elite (GTI 85+)",
    GOLD: "Tier 2 · Gold (GTI 70–84)",
    SILVER: "Tier 3 · Silver (GTI 50–69)",
    BRONZE: "Tier 4 · Bronze (GTI < 50)",
    ALL: "All Sports",
    RURAL: "Rural Athletes",
    U18: "Under 18 (Youth)",
  };

  if (map[val]) return map[val];
  return val
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CustomSelect({
  id,
  name,
  label,
  value,
  defaultValue = "",
  options,
  placeholder = "Select an option…",
  disabled = false,
  required = false,
  ariaDescribedBy,
  registerProps,
  onChange,
  className,
}: CustomSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  const {
    ref: registerRef,
    onChange: registerOnChange,
    onBlur: registerOnBlur,
    ...restRegister
  } = (registerProps ?? {}) as {
    ref?: React.Ref<HTMLSelectElement>;
    onChange?: React.ChangeEventHandler<HTMLSelectElement>;
    onBlur?: React.FocusEventHandler<HTMLSelectElement>;
  };

  const normalizedOptions: CustomSelectOption[] = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: formatOptionLabel(opt) };
    }
    return opt;
  });

  const [internalVal, setInternalVal] = useState<string>(defaultValue ?? "");
  const selectedVal = value !== undefined ? value : internalVal;
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  // Sync state when underlying select changes
  useEffect(() => {
    const select = selectRef.current;
    if (!select) return;
    const handleNativeChange = () => {
      setInternalVal(select.value);
    };
    select.addEventListener("change", handleNativeChange);
    return () => {
      select.removeEventListener("change", handleNativeChange);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    setInternalVal(val);
    setIsOpen(false);
    if (selectRef.current) {
      selectRef.current.value = val;
      const event = new Event("change", { bubbles: true });
      selectRef.current.dispatchEvent(event);
      if (registerOnChange) {
        registerOnChange({
          target: selectRef.current,
          currentTarget: selectRef.current,
          type: "change",
        } as unknown as React.ChangeEvent<HTMLSelectElement>);
      }
    }
    onChange?.(val);
    triggerRef.current?.focus();
  };

  const currentOption = normalizedOptions.find((opt) => opt.value === selectedVal);
  const displayLabel = currentOption ? currentOption.label : "";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(normalizedOptions.findIndex((opt) => opt.value === selectedVal) || 0);
      } else {
        const delta = e.key === "ArrowDown" ? 1 : -1;
        setHighlightedIndex((prev) => {
          const next = prev + delta;
          if (next < 0) return normalizedOptions.length - 1;
          if (next >= normalizedOptions.length) return 0;
          return next;
        });
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
        const selected = normalizedOptions[highlightedIndex];
        if (selected) handleSelect(selected.value);
      } else {
        setIsOpen((prev) => !prev);
      }
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0 max-w-full">
      {/* Real underlying accessible select for screen readers, forms & test runners */}
      <select
        ref={(node) => {
          selectRef.current = node;
          if (typeof registerRef === "function") {
            registerRef(node);
          }
        }}
        id={selectId}
        name={name}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        required={required}
        value={selectedVal}
        onChange={(e) => {
          setInternalVal(e.target.value);
          if (registerOnChange) registerOnChange(e);
          onChange?.(e.target.value);
        }}
        onBlur={(e) => {
          if (registerOnBlur) registerOnBlur(e);
        }}
        {...restRegister}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      >
        <option value="">{placeholder}</option>
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Styled custom trigger button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${selectId}-listbox`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full min-w-0 items-center justify-between rounded-md border border-input bg-card/75 px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-all duration-200",
          "hover:border-primary/60 hover:bg-card/95 hover:shadow-[0_0_12px_rgba(var(--primary),0.08)]",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
          isOpen &&
            "border-primary ring-2 ring-primary/30 shadow-[0_0_16px_rgba(var(--primary),0.15)]",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span
          className={cn(
            "truncate font-medium",
            !displayLabel && "text-muted-foreground font-normal",
          )}
        >
          {displayLabel || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "ml-2 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180 text-primary",
          )}
        />
      </button>

      {/* Redesigned Floating Popover Options Menu */}
      {isOpen && (
        <div
          id={`${selectId}-listbox`}
          ref={listboxRef}
          role="listbox"
          aria-label={label ?? name}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-xl border border-border/90 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {placeholder && (
            <div
              role="option"
              aria-selected={!selectedVal}
              onClick={() => handleSelect("")}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-xs text-muted-foreground cursor-pointer transition-colors",
                "hover:bg-primary/10 hover:text-primary",
                !selectedVal && "bg-primary/15 font-semibold text-primary",
              )}
            >
              <span>{placeholder}</span>
              {!selectedVal && <Check size={14} className="text-primary" />}
            </div>
          )}

          {normalizedOptions.map((opt, idx) => {
            const isSelected = selectedVal === opt.value;
            const isHighlighted = highlightedIndex === idx;

            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm cursor-pointer transition-all duration-150",
                  isSelected
                    ? "bg-primary/20 text-primary font-semibold shadow-xs"
                    : isHighlighted
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-popover-foreground hover:bg-secondary/70",
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check
                    size={16}
                    className="ml-2 shrink-0 text-primary animate-in fade-in zoom-in-75 duration-150"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
