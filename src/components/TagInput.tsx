'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type TagInputProps = {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
};

export const TagInput = ({ selectedTags, onChange }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [availableTags, setAvailableTags] = useState<{ tag: string; count: number }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all available tags on mount
  useEffect(() => {
    fetchTags();
  }, []);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      setAvailableTags(data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const filteredTags = availableTags.filter(
    t =>
      !selectedTags.includes(t.tag) &&
      t.tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onChange([...selectedTags, trimmedTag]);
      setInputValue('');
      setShowDropdown(false);
      inputRef.current?.focus();
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(selectedTags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const isExactMatch = filteredTags.some(t => t.tag.toLowerCase() === inputValue.toLowerCase());

  return (
    <div className="relative">
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-blue-600"
              aria-label={`Remove ${tag}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>

      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        placeholder="Type to add or create tags..."
        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Dropdown with suggestions */}
      {showDropdown && (inputValue || filteredTags.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {/* Create new tag option */}
          {inputValue && !isExactMatch && (
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-200 font-medium text-blue-600"
            >
              Create &quot;{inputValue}&quot;
            </button>
          )}

          {/* Existing tags */}
          {filteredTags.length > 0 ? (
            filteredTags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
              >
                <span>{tag}</span>
                <span className="text-xs text-gray-500">({count})</span>
              </button>
            ))
          ) : inputValue && !isExactMatch ? null : (
            <div className="px-4 py-2 text-gray-500 text-sm">No tags found</div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-1">
        Press Enter to add a tag, or click suggestions. Backspace to remove last tag.
      </p>
    </div>
  );
};
