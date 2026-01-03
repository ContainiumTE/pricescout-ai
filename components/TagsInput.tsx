import React, { useState, KeyboardEvent } from 'react';

interface TagsInputProps {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  icon: React.ReactNode;
}

export const TagsInput: React.FC<TagsInputProps> = ({ label, placeholder, tags, onChange, icon }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all shadow-sm">
        {tags.map((tag, index) => (
          <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 animate-fadeIn">
            {tag}
            <button
              onClick={() => removeTag(index)}
              className="hover:text-blue-600 focus:outline-none ml-1"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          className="flex-grow outline-none bg-transparent min-w-[120px] text-slate-700 placeholder-slate-400"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
        />
      </div>
      <p className="text-xs text-slate-500">Press Enter or Comma to add</p>
    </div>
  );
};