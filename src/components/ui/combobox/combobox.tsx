"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, Plus, X } from "lucide-react";
import { cn } from "cn";
import { Field, FieldDescription, FieldError, FieldLabel } from "../field";
import styles from "./combobox.module.css";

export type ComboboxOption = { value: string; label: string };

type CommonProps = {
  name: string;
  label: React.ReactNode;
  helpText?: React.ReactNode;
  error?: React.ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  createOption?: (query: string) => ComboboxOption | null;
};

type Source =
  | { options: ComboboxOption[]; loadOptions?: never; loadOnEmpty?: never }
  | {
      options?: never;
      loadOptions: (query: string, signal: AbortSignal) => Promise<ComboboxOption[]>;
      loadOnEmpty?: boolean;
    };
type Single = {
  multiple?: false;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
};
type Multiple = {
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

export type ComboboxFieldProps = CommonProps & Source & (Single | Multiple);

const CREATE_VALUE = "\0create:";

export function ComboboxField(props: ComboboxFieldProps) {
  const {
    name,
    label,
    helpText,
    error,
    invalid,
    disabled,
    required,
    placeholder,
    className,
    createOption,
    options,
    loadOptions,
    loadOnEmpty,
    multiple,
  } = props;
  const inputId = React.useId();
  const labelId = `${inputId}-label`;
  const [uncontrolled, setUncontrolled] = React.useState<string | null | string[]>(
    props.defaultValue ?? (multiple ? [] : null),
  );
  const current = props.value !== undefined ? props.value : uncontrolled;
  const selectedValues = multiple
    ? (current as string[])
    : current == null
      ? []
      : [current as string];
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ComboboxOption[]>([]);
  const [created, setCreated] = React.useState<ComboboxOption[]>([]);
  const [known, setKnown] = React.useState<ComboboxOption[]>([]);
  const [searchState, setSearchState] = React.useState<"idle" | "loading" | "error">(
    loadOnEmpty ? "loading" : "idle",
  );
  const [creationError, setCreationError] = React.useState(false);
  const requestId = React.useRef(0);

  React.useEffect(() => {
    if (!loadOptions) return;
    const trimmed = query.trim();
    const id = ++requestId.current;
    const controller = new AbortController();
    if (!trimmed && !loadOnEmpty) {
      return () => controller.abort();
    }
    const timer = window.setTimeout(() => {
      loadOptions(trimmed, controller.signal).then(
        (next) => {
          if (id !== requestId.current || controller.signal.aborted) return;
          setResults(next);
          setKnown((old) => mergeOptions(old, next));
          setSearchState("idle");
        },
        () => {
          if (id !== requestId.current || controller.signal.aborted) return;
          setResults([]);
          setSearchState("error");
        },
      );
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, loadOptions, loadOnEmpty]);

  const allOptions = mergeOptions(options ?? [], known, results, created);
  const selectedOptions = selectedValues.map(
    (value) => allOptions.find((option) => option.value === value) ?? { value, label: value },
  );
  const trimmed = query.trim();
  const normalized = trimmed.toLocaleLowerCase();
  const duplicate = mergeOptions(allOptions, selectedOptions).some(
    (option) =>
      option.value.trim().toLocaleLowerCase() === normalized ||
      option.label.trim().toLocaleLowerCase() === normalized,
  );
  const canCreate = Boolean(createOption && trimmed && !duplicate);
  const createItem: ComboboxOption = {
    value: CREATE_VALUE + trimmed,
    label: `Create “${trimmed}”`,
  };
  const available = loadOptions ? mergeOptions(results, selectedOptions, created) : allOptions;
  const items = canCreate ? [...available, createItem] : available;
  const visible = loadOptions
    ? items.filter(
        (item) =>
          item.value === createItem.value || results.some((result) => result.value === item.value),
      )
    : items.filter(
        (item) =>
          item.value === createItem.value ||
          !trimmed ||
          item.label.toLocaleLowerCase().includes(normalized),
      );
  const hasError =
    error != null && error !== false && (typeof error !== "string" || error.trim() !== "");

  function change(next: string | null | string[]) {
    if (props.value === undefined) setUncontrolled(next);
    if (props.multiple) props.onValueChange?.(next as string[]);
    else props.onValueChange?.(next as string | null);
  }

  function select(next: ComboboxOption | ComboboxOption[] | null) {
    const values = next == null ? [] : Array.isArray(next) ? next : [next];
    const create = values.find((item) => item.value.startsWith(CREATE_VALUE));
    if (create && createOption) {
      let option: ComboboxOption | null = null;
      try {
        option = createOption(create.value.slice(CREATE_VALUE.length));
      } catch {
        // A rejected domain value is shown as a field-local creation error.
      }
      if (
        !option ||
        !option.value.trim() ||
        !option.label.trim() ||
        allOptions.some(
          (item) =>
            item.value === option.value ||
            item.label.toLocaleLowerCase() === option.label.toLocaleLowerCase(),
        ) ||
        selectedValues.includes(option.value)
      ) {
        setCreationError(true);
        return;
      }
      setCreated((old) => mergeOptions(old, [option]));
      setKnown((old) => mergeOptions(old, [option]));
      change(multiple ? [...selectedValues, option.value] : option.value);
    } else {
      change(multiple ? values.map((item) => item.value) : (values[0]?.value ?? null));
    }
    setCreationError(false);
    setQuery("");
    const preservingBrowseResults = Boolean(loadOptions && loadOnEmpty && !trimmed);
    if (!preservingBrowseResults) {
      setResults([]);
      setSearchState(loadOptions && loadOnEmpty && trimmed ? "loading" : "idle");
    }
  }

  const status = creationError
    ? "Could not create this option."
    : searchState === "loading"
      ? "Searching…"
      : searchState === "error"
        ? "Search failed. Try again."
        : loadOptions && !trimmed && !loadOnEmpty
          ? "Type to search."
          : visible.length === 0
            ? "No matches."
            : null;

  return (
    <Field disabled={disabled} invalid={hasError || invalid || creationError} className={className}>
      <FieldLabel id={labelId} htmlFor={inputId}>
        {label}
      </FieldLabel>
      <Combobox.Root<ComboboxOption, typeof multiple>
        name={name}
        items={items}
        filteredItems={visible}
        filter={null}
        multiple={multiple}
        value={multiple ? selectedOptions : (selectedOptions[0] ?? null)}
        onValueChange={(next) => select(next as ComboboxOption | ComboboxOption[] | null)}
        isItemEqualToValue={(item, value) => item.value === value.value}
        itemToStringLabel={(item) => item.label}
        itemToStringValue={(item) => item.value}
        inputValue={multiple ? query : undefined}
        onInputValueChange={(next, details) => {
          if (details.reason === "item-press") return;
          setQuery(next);
          if (details.reason === "input-change") setCreationError(false);
          if (loadOptions) {
            setResults([]);
            setSearchState(next.trim() || loadOnEmpty ? "loading" : "idle");
          }
        }}
        disabled={disabled}
        required={required}
      >
        <Combobox.InputGroup className={styles.group}>
          {multiple ? (
            <Combobox.Value>
              {(value: ComboboxOption[]) => (
                <Combobox.Chips
                  className={styles.chips}
                  aria-label={value.length ? "Selected options" : undefined}
                >
                  {value.map((item) => (
                    <Combobox.Chip key={item.value} className={styles.chip} aria-label={item.label}>
                      {item.label}
                      <Combobox.ChipRemove
                        className={styles.remove}
                        aria-label={`Remove ${item.label}`}
                      >
                        <X aria-hidden="true" size={14} />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  ))}
                  <Combobox.Input
                    id={inputId}
                    className={styles.input}
                    placeholder={value.length ? "" : placeholder}
                    aria-invalid={hasError || invalid || creationError || undefined}
                  />
                </Combobox.Chips>
              )}
            </Combobox.Value>
          ) : (
            <Combobox.Input
              id={inputId}
              className={cn(styles.input, styles.singleInput)}
              placeholder={placeholder}
              aria-invalid={hasError || invalid || creationError || undefined}
            />
          )}
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner className={styles.positioner} sideOffset={4}>
            <Combobox.Popup
              className={styles.popup}
              aria-busy={searchState === "loading" || undefined}
            >
              {status && <Combobox.Status className={styles.status}>{status}</Combobox.Status>}
              <Combobox.List aria-labelledby={labelId} className={styles.list}>
                {(item: ComboboxOption) => (
                  <Combobox.Item key={item.value} value={item} className={styles.item}>
                    {item.value.startsWith(CREATE_VALUE) && <Plus aria-hidden="true" size={16} />}
                    {item.label}
                    {!item.value.startsWith(CREATE_VALUE) && (
                      <Combobox.ItemIndicator className={styles.itemIndicator}>
                        <Check aria-hidden="true" size={16} />
                      </Combobox.ItemIndicator>
                    )}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {helpText != null && <FieldDescription>{helpText}</FieldDescription>}
      <FieldError match={hasError || creationError ? true : undefined}>
        {creationError ? "Could not create this option." : hasError ? error : undefined}
      </FieldError>
    </Field>
  );
}

function mergeOptions(...groups: ComboboxOption[][]): ComboboxOption[] {
  const byValue = new Map<string, ComboboxOption>();
  for (const group of groups) for (const option of group) byValue.set(option.value, option);
  return [...byValue.values()];
}
