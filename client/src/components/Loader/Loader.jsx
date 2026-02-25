import "./Loader.css";

/**
 * Reusable, theme-aware Loader component.
 *
 * Variants:
 *   page    → full viewport centred (route transitions, initial load)
 *   section → padded block inside a card / panel
 *   inline  → small spinner beside text
 *   button  → tiny spinner for inside buttons
 */
const Loader = ({ variant = "section", text = "", className = "" }) => {
  const sizeMap = { page: 48, section: 36, inline: 20, button: 16 };
  const size = sizeMap[variant] || 36;

  if (variant === "page") {
    return (
      <div className={`loader-page ${className}`}>
        <div className="loader-page-inner">
          <div className="loader-spinner" style={{ width: size, height: size }} />
          {text && <p className="loader-text">{text}</p>}
        </div>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <span className={`loader-button ${className}`}>
        <div
          className="loader-spinner loader-spinner--button"
          style={{ width: size, height: size }}
        />
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <span className={`loader-inline ${className}`}>
        <div
          className="loader-spinner loader-spinner--inline"
          style={{ width: size, height: size }}
        />
        {text && <span className="loader-text loader-text--inline">{text}</span>}
      </span>
    );
  }

  // section (default)
  return (
    <div className={`loader-section ${className}`}>
      <div className="loader-spinner" style={{ width: size, height: size }} />
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
};

export default Loader;
