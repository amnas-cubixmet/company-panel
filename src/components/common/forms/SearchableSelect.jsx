import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from 'lucide-react';

/** Existing client-side searchable picker; options remain supplied by the page/API. */
export const SearchableSelect = ({
  label, options = [], value, onChange, placeholder = 'Select option...',
  error, required = false, disabled = false, containerStyle = {}
}) => {
  const id = useId().replace(/:/g, '');
  const controlId = 'cg-searchable-' + id;
  const listId = controlId + '-options';
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const uniqueOptions = useMemo(() => {
    const seen = new Set();
    return options.filter((item) => {
      const key = String(typeof item === 'object' ? item.value : item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options]);

  const selectedOpt = uniqueOptions.find((item) =>
    String(typeof item === 'object' ? item.value : item) === String(value ?? ''));
  const selectedLabel = selectedOpt
    ? (typeof selectedOpt === 'object' ? selectedOpt.label : selectedOpt)
    : '';
  const filteredOptions = uniqueOptions.filter((item) =>
    String(typeof item === 'object' ? item.label : item)
      .toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!isOpen) return undefined;
    searchRef.current?.focus();
    const onOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', onOutsideClick);
    return () => document.removeEventListener('pointerdown', onOutsideClick);
  }, [isOpen]);

  const close = (restoreFocus = false) => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
    if (restoreFocus) triggerRef.current?.focus();
  };
  const choose = (item) => {
    const next = typeof item === 'object' ? item.value : item;
    onChange?.(next);
    close(true);
  };
  const open = (initialIndex = 0) => {
    if (disabled) return;
    setActiveIndex(initialIndex);
    setQuery('');
    setIsOpen(true);
  };
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(Math.max(index + (event.key === 'ArrowDown' ? 1 : -1), 0), Math.max(filteredOptions.length - 1, 0)));
    } else if (event.key === 'Enter' && filteredOptions[activeIndex]) {
      event.preventDefault();
      choose(filteredOptions[activeIndex]);
    } else if (event.key === 'Tab') {
      close();
    }
  };

  return (
    <div ref={rootRef}
      className="form-field cubegears-field-group cg-floating-searchable"
      data-filled={Boolean(selectedLabel)} data-open={isOpen} data-disabled={disabled}
      style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%', position: 'relative', ...containerStyle }}>
      {label && <label htmlFor={controlId} className="cg-searchable-label">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>}
      <div className="searchable-select-wrapper">
        <button ref={triggerRef} id={controlId} type="button" role="combobox"
          aria-expanded={isOpen} aria-controls={listId} aria-haspopup="listbox"
          aria-label={label || placeholder} aria-required={required}
          aria-invalid={Boolean(error)} disabled={disabled}
          className={'form-control cg-searchable-trigger' + (error ? ' has-error' : '')}
          onClick={() => isOpen ? close() : open()}
          onKeyDown={(event) => {
            if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
              event.preventDefault();
              open(event.key === 'ArrowUp' ? Math.max(uniqueOptions.length - 1, 0) : 0);
            } else if (isOpen) onKeyDown(event);
          }}>
          <span className={'cg-searchable-value' + (!selectedLabel ? ' is-placeholder' : '')}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
        {value !== '' && value !== null && value !== undefined && !disabled && (
          <button type="button" className="cg-searchable-clear"
            aria-label={'Clear ' + (label || 'selection')}
            onClick={() => { onChange?.(''); close(); }}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
        {isOpen && (
          <div className="searchable-select-menu cg-searchable-menu">
            <div className="cg-searchable-search">
              <Search size={17} aria-hidden="true" />
              <input ref={searchRef} type="search" value={query}
                aria-label={'Search ' + (label || 'options')}
                aria-controls={listId}
                aria-activedescendant={filteredOptions.length ? listId + '-' + activeIndex : undefined}
                onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
                onKeyDown={onKeyDown} placeholder="Type to search…" />
            </div>
            <div role="listbox" aria-label={label || 'Options'} id={listId}
              className="cg-searchable-list">
              {filteredOptions.length === 0
                ? <div className="cg-searchable-empty">No matching options</div>
                : filteredOptions.map((item, index) => {
                  const key = typeof item === 'object' ? item.value : item;
                  const text = typeof item === 'object' ? item.label : item;
                  const selected = String(key) === String(value ?? '');
                  return (
                    <button type="button" key={String(key)} role="option"
                      tabIndex={-1} id={listId + '-' + index}
                      aria-selected={selected}
                      className={'searchable-select-item' + (selected ? ' selected' : '') +
                        (activeIndex === index ? ' is-active' : '')}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(item)}>{text}</button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
      {error && <span className="form-error cubegears-error-text" role="alert">{error}</span>}
    </div>
  );
};
