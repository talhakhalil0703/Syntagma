import React from "react";

export const SettingHeading = ({ title }: { title: string }) => {
    // Only render heading if no activeTab is active (meaning not injected) or is explicitly active
    return (
        <h3 style={{
            fontSize: "20px",
            fontWeight: 500,
            color: "var(--text-primary)",
            margin: "0 0 24px 0",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--bg-border)"
        }}>
            {title}
        </h3>
    );
};

export const SettingItem = ({
    name,
    description,
    control
}: {
    name: string;
    description: string;
    control: React.ReactNode;
}) => {
    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 0",
            borderBottom: "1px solid var(--bg-border)",
            gap: "24px"
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: "var(--text-primary)", marginBottom: "4px" }}>
                    {name}
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    {description}
                </div>
            </div>
            <div style={{ flexShrink: 0 }}>
                {control}
            </div>
        </div>
    );
};

// Form Controls

export const SettingToggle = ({ value, onChange }: { value: boolean; onChange: (val: boolean) => void }) => {
    return (
        <div
            onClick={() => onChange(!value)}
            style={{
                width: "40px",
                height: "24px",
                backgroundColor: value ? "var(--text-accent)" : "transparent",
                border: value ? "none" : "1px solid var(--text-secondary)",
                borderRadius: "12px",
                position: "relative",
                cursor: "pointer",
                transition: "all 0.2s"
            }}
        >
            <div style={{
                width: "18px",
                height: "18px",
                backgroundColor: value ? "white" : "var(--text-secondary)",
                borderRadius: "50%",
                position: "absolute",
                top: "2px", // Corrected
                left: value ? "18px" : "2px",
                transition: "left 0.2s"
            }} />
        </div>
    );
};

export const SettingText = ({ value, onChange, placeholder }: { value: string; onChange: (val: string) => void; placeholder?: string }) => {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                padding: "6px 10px",
                borderRadius: "4px",
                border: "1px solid var(--bg-border)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                minWidth: "200px",
                outline: "none"
            }}
            onFocus={e => e.target.style.borderColor = "var(--text-accent)"}
            onBlur={e => e.target.style.borderColor = "var(--bg-border)"}
        />
    );
};

export const SettingSelect = ({ value, onChange, options }: { value: string; onChange: (val: string) => void; options: { label: string; value: string }[] }) => {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                padding: "6px 10px",
                borderRadius: "4px",
                border: "1px solid var(--bg-border)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: "none",
                cursor: "pointer"
            }}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
};

export const SettingButton = ({ label, onClick, primary = false }: { label: string; onClick: () => void; primary?: boolean }) => {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: primary ? "none" : "1px solid var(--bg-border)",
                backgroundColor: primary ? "var(--text-accent)" : "transparent",
                color: primary ? "white" : "var(--text-primary)",
                cursor: "pointer",
                fontWeight: 500,
                transition: "all 0.2s",
                outline: "none"
            }}
        >
            {label}
        </button>
    );
};
