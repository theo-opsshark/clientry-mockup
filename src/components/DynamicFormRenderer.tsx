"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Zap, ChevronRight } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FieldOption {
  value: string;
  label: string;
}

interface Conditional {
  fieldId: string;
  operator: "equals" | "in" | "contains";
  values: string[];
}

interface FormField {
  id: string;
  type: "short_text" | "paragraph" | "dropdown" | "single_choice" | "checkbox_group" | "file_upload" | "date_picker";
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  conditional?: Conditional;
  accept?: string;
  multiple?: boolean;
}

interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

interface FormSchema {
  id: string;
  title: string;
  sections: FormSection[];
}

interface DynamicFormRendererProps {
  schema: FormSchema;
  onSubmit: (values: Record<string, unknown>) => void;
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  backgroundColor: "#0f0f13",
  border: "1px solid #1e1e2a",
  color: "#e2e8f0",
  borderRadius: "8px",
  padding: "10px 14px",
  width: "100%",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.15s",
};

const inputError: React.CSSProperties = {
  ...inputBase,
  border: "1px solid #f87171",
};

// ─── Conditional Evaluation ────────────────────────────────────────────────────

function evaluateConditional(
  conditional: Conditional | undefined,
  values: Record<string, unknown>
): boolean {
  if (!conditional) return true;
  const { fieldId, operator, values: condValues } = conditional;
  const fieldValue = values[fieldId];

  switch (operator) {
    case "equals":
      return condValues.includes(fieldValue as string);
    case "in":
      return condValues.includes(fieldValue as string);
    case "contains":
      if (Array.isArray(fieldValue)) {
        return condValues.some((v) => (fieldValue as string[]).includes(v));
      }
      return false;
    default:
      return true;
  }
}

// ─── Field Components ──────────────────────────────────────────────────────────

function FieldLabel({ field, hasError }: { field: FormField; hasError: boolean }) {
  return (
    <div style={{ marginBottom: "6px" }}>
      <span style={{ fontSize: "13px", fontWeight: 500, color: hasError ? "#f87171" : "#94a3b8" }}>
        {field.label}
        {field.required && <span style={{ color: "#f87171", marginLeft: "3px" }}>*</span>}
      </span>
      {field.description && (
        <p style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>{field.description}</p>
      )}
    </div>
  );
}

function ShortTextField({
  field,
  value,
  onChange,
  hasError,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  return (
    <div>
      <FieldLabel field={field} hasError={hasError} />
      <input
        type="text"
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={hasError ? inputError : inputBase}
        onFocus={(e) => { if (!hasError) e.target.style.borderColor = "#06b6d4"; }}
        onBlur={(e) => { e.target.style.borderColor = hasError ? "#f87171" : "#1e1e2a"; }}
      />
      {hasError && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>This field is required</p>}
    </div>
  );
}

function ParagraphField({
  field,
  value,
  onChange,
  hasError,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  return (
    <div>
      <FieldLabel field={field} hasError={hasError} />
      <textarea
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{ ...(hasError ? inputError : inputBase), resize: "vertical", fontFamily: "inherit" }}
        onFocus={(e) => { if (!hasError) (e.target as HTMLTextAreaElement).style.borderColor = "#06b6d4"; }}
        onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = hasError ? "#f87171" : "#1e1e2a"; }}
      />
      {hasError && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>This field is required</p>}
    </div>
  );
}

function DropdownField({
  field,
  value,
  onChange,
  hasError,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  return (
    <div>
      <FieldLabel field={field} hasError={hasError} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...(hasError ? inputError : inputBase),
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          paddingRight: "36px",
        }}
      >
        <option value="" disabled>Select an option...</option>
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: "#141418" }}>
            {opt.label}
          </option>
        ))}
      </select>
      {hasError && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>This field is required</p>}
    </div>
  );
}

function SingleChoiceField({
  field,
  value,
  onChange,
  hasError,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  return (
    <div>
      <FieldLabel field={field} hasError={hasError} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {field.options?.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: selected ? "1px solid #06b6d4" : "1px solid #1e1e2a",
                backgroundColor: selected ? "rgba(6,182,212,0.08)" : "#0f0f13",
                color: selected ? "#06b6d4" : "#94a3b8",
                fontSize: "14px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                border: selected ? "5px solid #06b6d4" : "2px solid #334155",
                flexShrink: 0,
                transition: "all 0.15s",
              }} />
              {opt.label}
            </button>
          );
        })}
      </div>
      {hasError && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>This field is required</p>}
    </div>
  );
}

function CheckboxGroupField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <div>
      <FieldLabel field={field} hasError={false} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {field.options?.map((opt) => {
          const checked = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              style={{
                padding: "7px 14px",
                borderRadius: "20px",
                border: checked ? "1px solid #06b6d4" : "1px solid #1e1e2a",
                backgroundColor: checked ? "rgba(6,182,212,0.1)" : "#0f0f13",
                color: checked ? "#06b6d4" : "#64748b",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: "14px",
                height: "14px",
                borderRadius: "3px",
                border: checked ? "none" : "2px solid #334155",
                backgroundColor: checked ? "#06b6d4" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "10px",
                color: "white",
              }}>
                {checked && "✓"}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FileUploadField({ field }: { field: FormField }) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<string[]>([]);

  return (
    <div>
      <FieldLabel field={field} hasError={false} />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = Array.from(e.dataTransfer.files).map((f) => f.name);
          setFiles((prev) => [...prev, ...dropped]);
        }}
        style={{
          border: `2px dashed ${dragging ? "#06b6d4" : "#1e1e2a"}`,
          borderRadius: "10px",
          padding: "28px",
          textAlign: "center",
          backgroundColor: dragging ? "rgba(6,182,212,0.04)" : "transparent",
          transition: "all 0.2s",
          cursor: "pointer",
        }}
      >
        <Upload size={22} style={{ color: "#475569", margin: "0 auto 8px" }} />
        <p style={{ fontSize: "14px", color: "#64748b" }}>
          Drag files here or{" "}
          <label style={{ color: "#06b6d4", cursor: "pointer" }}>
            browse
            <input type="file" accept={field.accept} multiple={field.multiple} style={{ display: "none" }}
              onChange={(e) => {
                const picked = Array.from(e.target.files || []).map((f) => f.name);
                setFiles((prev) => [...prev, ...picked]);
              }} />
          </label>
        </p>
        <p style={{ fontSize: "12px", color: "#334155", marginTop: "4px" }}>
          {field.accept || "Any file"} — up to 10MB each
        </p>
        {files.length > 0 && (
          <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
            {files.map((f, i) => (
              <span key={i} style={{
                fontSize: "12px",
                color: "#06b6d4",
                backgroundColor: "rgba(6,182,212,0.1)",
                padding: "3px 10px",
                borderRadius: "12px",
              }}>
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DatePickerField({
  field,
  value,
  onChange,
  hasError,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  return (
    <div>
      <FieldLabel field={field} hasError={hasError} />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...(hasError ? inputError : inputBase),
          colorScheme: "dark",
        }}
      />
      {hasError && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>This field is required</p>}
    </div>
  );
}

// ─── Animated Field Wrapper ────────────────────────────────────────────────────

function AnimatedField({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="field"
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
        >
          <div style={{ paddingTop: "2px" }}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DynamicFormRenderer({ schema, onSubmit }: DynamicFormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [currentSection, setCurrentSection] = useState(0);

  const setValue = useCallback((fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
  }, []);

  const allFields = schema.sections.flatMap((s) => s.fields);

  function isVisible(field: FormField): boolean {
    return evaluateConditional(field.conditional, values);
  }

  function validate(): boolean {
    const newErrors = new Set<string>();
    for (const field of allFields) {
      if (!field.required) continue;
      if (!isVisible(field)) continue;
      const val = values[field.id];
      if (!val || (typeof val === "string" && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
        newErrors.add(field.id);
      }
    }
    setErrors(newErrors);
    return newErrors.size === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) {
      onSubmit(values);
    }
  }

  function renderField(field: FormField) {
    const hasError = errors.has(field.id);
    const val = values[field.id];

    switch (field.type) {
      case "short_text":
        return (
          <ShortTextField
            field={field}
            value={(val as string) || ""}
            onChange={(v) => setValue(field.id, v)}
            hasError={hasError}
          />
        );
      case "paragraph":
        return (
          <ParagraphField
            field={field}
            value={(val as string) || ""}
            onChange={(v) => setValue(field.id, v)}
            hasError={hasError}
          />
        );
      case "dropdown":
        return (
          <DropdownField
            field={field}
            value={(val as string) || ""}
            onChange={(v) => setValue(field.id, v)}
            hasError={hasError}
          />
        );
      case "single_choice":
        return (
          <SingleChoiceField
            field={field}
            value={(val as string) || ""}
            onChange={(v) => setValue(field.id, v)}
            hasError={hasError}
          />
        );
      case "checkbox_group":
        return (
          <CheckboxGroupField
            field={field}
            value={(val as string[]) || []}
            onChange={(v) => setValue(field.id, v)}
          />
        );
      case "file_upload":
        return <FileUploadField field={field} />;
      case "date_picker":
        return (
          <DatePickerField
            field={field}
            value={(val as string) || ""}
            onChange={(v) => setValue(field.id, v)}
            hasError={hasError}
          />
        );
      default:
        return null;
    }
  }

  const totalSections = schema.sections.length;
  const section = schema.sections[currentSection];

  // Count visible fields with errors in current section
  const sectionHasErrors = section.fields.some(
    (f) => errors.has(f.id) && isVisible(f)
  );

  const isLastSection = currentSection === totalSections - 1;

  function goNext() {
    // Validate current section fields
    const newErrors = new Set(errors);
    for (const field of section.fields) {
      if (!field.required || !isVisible(field)) continue;
      const val = values[field.id];
      if (!val || (typeof val === "string" && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
        newErrors.add(field.id);
      }
    }
    setErrors(newErrors);
    const sectionErrors = section.fields.some((f) => newErrors.has(f.id) && isVisible(f));
    if (!sectionErrors) {
      setCurrentSection((s) => s + 1);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Dynamic banner */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        borderRadius: "8px",
        border: "1px solid rgba(6,182,212,0.25)",
        backgroundColor: "rgba(6,182,212,0.06)",
        marginBottom: "24px",
      }}>
        <Zap size={14} style={{ color: "#06b6d4", flexShrink: 0 }} />
        <span style={{ fontSize: "13px", color: "#22d3ee" }}>
          This form is dynamically rendered from your JSM project&apos;s Proforma schema
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            Section {currentSection + 1} of {totalSections}
          </span>
          <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>
            {schema.sections[currentSection].title}
          </span>
        </div>
        <div style={{ height: "4px", backgroundColor: "#1e1e2a", borderRadius: "4px", overflow: "hidden" }}>
          <motion.div
            style={{ height: "100%", backgroundColor: "#06b6d4", borderRadius: "4px" }}
            animate={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        {/* Section steps */}
        <div style={{ display: "flex", gap: "4px", marginTop: "10px" }}>
          {schema.sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentSection(i)}
              style={{
                flex: 1,
                padding: "6px 8px",
                fontSize: "12px",
                borderRadius: "6px",
                border: i === currentSection ? "1px solid #06b6d4" : "1px solid #1e1e2a",
                backgroundColor: i === currentSection ? "rgba(6,182,212,0.08)" : i < currentSection ? "rgba(6,182,212,0.04)" : "transparent",
                color: i === currentSection ? "#06b6d4" : i < currentSection ? "#22d3ee" : "#475569",
                cursor: "pointer",
                transition: "all 0.15s",
                fontWeight: i === currentSection ? 500 : 400,
              }}
            >
              {i < currentSection ? "✓ " : ""}{s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Section content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={section.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div style={{
            backgroundColor: "#141418",
            border: `1px solid ${sectionHasErrors ? "rgba(248,113,113,0.3)" : "#1e1e2a"}`,
            borderRadius: "12px",
            padding: "24px",
          }}>
            {/* Section header */}
            <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #1e1e2a" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#e2e8f0" }}>{section.title}</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {section.fields.map((field) => {
                const visible = isVisible(field);
                const hasConditional = !!field.conditional;

                if (!hasConditional) {
                  return (
                    <div key={field.id}>
                      {renderField(field)}
                    </div>
                  );
                }

                return (
                  <AnimatedField key={field.id} visible={visible}>
                    <div style={{
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid rgba(6,182,212,0.2)",
                      backgroundColor: "rgba(6,182,212,0.03)",
                    }}>
                      {renderField(field)}
                    </div>
                  </AnimatedField>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
        <button
          type="button"
          onClick={() => currentSection > 0 ? setCurrentSection((s) => s - 1) : undefined}
          disabled={currentSection === 0}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid #1e1e2a",
            backgroundColor: "transparent",
            color: currentSection === 0 ? "#334155" : "#64748b",
            fontSize: "14px",
            cursor: currentSection === 0 ? "not-allowed" : "pointer",
          }}
        >
          ← Back
        </button>

        {isLastSection ? (
          <button
            type="submit"
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#06b6d4",
              color: "white",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Submit Request →
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#06b6d4",
              color: "white",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </form>
  );
}
